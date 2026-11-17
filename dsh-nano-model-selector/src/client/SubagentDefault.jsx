/** Media-tab subagent default: the same row, popup menu, and action strip as DNMS. */
import * as React from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoMenu } from 'dsh-nano-ui'
import { BrandMark } from './BrandMark.jsx'
import { CheckIcon, ModelIcon } from './icons.jsx'
import { fetchSubagentDefault, writeSubagentDefault } from './subagent-default.js'

/** @param {string} provider @param {string} model */
function keyOf(provider, model) {
  return `${provider}\u0000${model}`
}

/** @param {object} item @param {string} query */
function matchesQuery(item, query) {
  const wanted = query.trim().toLowerCase()
  if (wanted === '') return true
  return `${item.model.name} ${item.model.id} ${item.brandName} ${item.group.name}`.toLowerCase().includes(wanted)
}

/**
 * @param {{copy: object, models: Array, query: string}} props
 */
export function SubagentDefault({ copy, models, query }) {
  const [policy, setPolicy] = React.useState(undefined)
  const [draftKey, setDraftKey] = React.useState('')
  const [draftEffort, setDraftEffort] = React.useState('')
  const [menu, setMenu] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const touched = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    fetchSubagentDefault()
      .then(next => {
        if (cancelled) return
        setPolicy(next)
        if (!touched.current && next?.provider && next?.model) {
          setDraftKey(keyOf(next.provider, next.model))
          setDraftEffort(next.reasoningEffort ?? '')
        }
      })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)) })
    return () => { cancelled = true }
  }, [])

  const selected = models.find(item => keyOf(item.group.id, item.model.id) === draftKey)
  const efforts = selected?.reasoning?.efforts ?? []
  const savedKey = policy?.provider && policy?.model ? keyOf(policy.provider, policy.model) : ''
  const saved = savedKey === draftKey && (policy?.reasoningEffort ?? '') === draftEffort
  const effortName = draftEffort === ''
    ? copy.providerDefault
    : efforts.find(level => level.id === draftEffort)?.name ?? draftEffort

  const actions = []
  let brand = ''
  for (const item of models.filter(candidate => matchesQuery(candidate, query))) {
    if (item.brandName !== brand) {
      if (brand !== '') actions.push({ id: `brand:${brand}`, separator: true })
      brand = item.brandName
    }
    actions.push({
      id: keyOf(item.group.id, item.model.id),
      label: item.model.name,
      icon: <BrandMark brandKey={item.brandKey} brandName={item.brandName} />,
      run: () => choose(item),
    })
  }

  const choose = item => {
    touched.current = true
    setDraftKey(keyOf(item.group.id, item.model.id))
    const nextEfforts = item.reasoning?.efforts ?? []
    const fallback = item.reasoning?.defaultEffort
    setDraftEffort(typeof fallback === 'string' && nextEfforts.some(level => level.id === fallback)
      ? fallback
      : (nextEfforts[0]?.id ?? ''))
    setError('')
  }

  const openMenu = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    const panel = event.currentTarget.closest('.nms-panel')?.getBoundingClientRect()
    setMenu({
      x: rect.left - (panel?.left ?? 0),
      y: rect.top - (panel?.top ?? 0),
      width: rect.width,
      height: rect.height,
    })
  }

  const run = async action => {
    if (action === 'enable' && selected === undefined) return
    setBusy(true)
    setError('')
    try {
      const next = await writeSubagentDefault(action, action === 'enable' ? {
        provider: selected.group.id,
        model: selected.model.id,
        ...(draftEffort ? { reasoningEffort: draftEffort } : {}),
      } : undefined)
      setPolicy(next)
      if (action === 'reset') {
        touched.current = false
        setDraftKey('')
        setDraftEffort('')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="nms-group">
        <ModelIcon className="nms-group-star" size={12} />
        {copy.subagentTitle}
        <span className="nms-group-count">{copy.subagentSubtitle}</span>
      </div>
      <div className="nms-model-row" data-active={policy?.enabled === true && saved} data-pending={busy} data-subagent-default>
        <button
          type="button"
          className="nms-model-main"
          disabled={busy || policy === undefined}
          title={copy.subagentHint}
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          onClick={openMenu}
        >
          <span className="nms-model-mark">
            {selected
              ? <BrandMark brandKey={selected.brandKey} brandName={selected.brandName} />
              : <ModelIcon size={18} />}
          </span>
          <span className="nms-model-copy">
            <span className="nms-model-line">
              <span className="nms-model-name">{selected?.model.name ?? copy.subagentUnset}</span>
              {policy?.provider && saved && (
                <Tag tone={policy.enabled ? 'success' : 'warning'}>{policy.enabled ? copy.subagentOn : copy.subagentOff}</Tag>
              )}
            </span>
            <span className="nms-model-desc">{selected ? selected.model.description ?? selected.model.id : copy.subagentPickPlaceholder}</span>
            <span className="nms-model-meta">{selected ? `${selected.brandName} · ${copy.effort} ${effortName}` : copy.subagentHint}</span>
          </span>
        </button>
        <span className="nms-model-side">
          {busy && <span className="nms-pending-dot" aria-label={copy.switching} />}
          {!busy && policy?.enabled === true && saved && <span className="nms-check"><CheckIcon size={16} /></span>}
        </span>
      </div>
      <NanoMenu menu={menu} actions={actions} onClose={() => setMenu(null)} width={280} maxHeight={240} portal={false} direction="up" />
      <div className="nms-effort">
        <span className="nms-effort-label">{copy.effort}</span>
        {selected === undefined || efforts.length === 0 ? (
          <span className="nms-effort-note">{selected === undefined ? copy.selectModel : copy.noEffort}</span>
        ) : (
          <div className="nms-effort-list" role="group" aria-label={copy.effort}>
            <button
              type="button"
              className="nms-effort-button"
              data-active={draftEffort === ''}
              disabled={busy}
              onClick={() => { touched.current = true; setDraftEffort('') }}
            >
              {copy.providerDefault}
            </button>
            {efforts.map(level => (
              <button
                key={level.id}
                type="button"
                className="nms-effort-button"
                data-active={draftEffort === level.id}
                title={level.description ?? level.name}
                disabled={busy}
                onClick={() => { touched.current = true; setDraftEffort(level.id) }}
              >
                {level.name}
              </button>
            ))}
          </div>
        )}
        <div className="nms-effort-list">
          <Button size="sm" variant="primary" disabled={busy || selected === undefined || (policy?.enabled === true && saved)} onClick={() => run('enable')}>{copy.subagentEnable}</Button>
          <Button size="sm" variant="outline" disabled={busy || policy?.enabled !== true} onClick={() => run('disable')}>{copy.subagentDisable}</Button>
          <Button size="sm" variant="ghost" disabled={busy || policy == null} onClick={() => run('reset')}>{copy.subagentReset}</Button>
        </div>
      </div>
      {error !== '' && <div className="nms-error" role="alert"><span className="nms-error-copy">{error}</span></div>}
    </>
  )
}
