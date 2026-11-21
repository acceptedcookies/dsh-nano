/** Current-session magpie account picker. Rows, groups, and type match the model list. */

import * as React from 'react'
import { jsonOp, call } from './jsonClient.js'
import { BrandMark } from './BrandMark.jsx'
import { AccountPinIcon, CheckIcon, WarningIcon } from './icons.jsx'

const ROUTE = '/nano-model-selector/account-pin'

function representatives(models) {
  const seen = new Set()
  const out = []
  for (const item of models) {
    if (item?.group?.id !== 'magpie') continue
    const id = item?.model?.id
    if (typeof id !== 'string' || !id.includes('/')) continue
    const upstream = id.slice(0, id.indexOf('/'))
    if (seen.has(upstream)) continue
    seen.add(upstream)
    out.push({
      upstream,
      model: id,
      brandKey: typeof item.brandKey === 'string' ? item.brandKey : upstream,
      brandName: typeof item.brandName === 'string' ? item.brandName : upstream,
    })
  }
  return out.slice(0, 8)
}

function AccountRow({ active, pending, brandKey, brandName, name, desc, onClick }) {
  return (
    <div className="nms-model-row" data-active={active} data-pending={pending || undefined}>
      <button type="button" className="nms-model-main" disabled={pending} title={name} onClick={onClick}>
        <span className="nms-model-mark"><BrandMark brandKey={brandKey} brandName={brandName} /></span>
        <span className="nms-model-copy">
          <span className="nms-model-line"><span className="nms-model-name">{name}</span></span>
          <span className="nms-model-desc">{desc}</span>
        </span>
      </button>
      <span className="nms-model-side">
        {pending && <span className="nms-pending-dot" />}
        {active && !pending && <span className="nms-check"><CheckIcon size={16} /></span>}
      </span>
    </div>
  )
}

export function AccountPinPanel({ copy, sessionId, models }) {
  const reps = React.useMemo(() => representatives(models), [models])
  const [state, setState] = React.useState({ status: 'loading', pins: {}, accounts: [], error: '', pending: '' })
  const load = React.useCallback(async () => {
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      setState({ status: 'empty', pins: {}, accounts: [], error: '', pending: '' })
      return
    }
    setState(current => ({ ...current, status: 'loading', error: '', pending: '' }))
    try {
      const query = new URLSearchParams({ sessionId, discover: '1', models: reps.map(item => item.model).join(',') })
      const data = await call(jsonOp({ method: 'GET', url: `${ROUTE}?${query.toString()}` }))
      setState({
        status: 'ready',
        pins: data?.pins ?? {},
        accounts: Array.isArray(data?.accounts) ? data.accounts : [],
        error: '',
        pending: '',
      })
    } catch (error) {
      setState({ status: 'error', pins: {}, accounts: [], error: error instanceof Error ? error.message : copy.accountPinError, pending: '' })
    }
  }, [sessionId, reps, copy.accountPinError])
  React.useEffect(() => { load() }, [load])

  const choose = async (upstream, account) => {
    setState(current => ({ ...current, pending: `${upstream}:${account ?? ''}`, error: '' }))
    try {
      const data = await call(jsonOp({ method: 'PUT', url: ROUTE }), { sessionId, upstream, account })
      setState(current => ({ ...current, pins: data?.pins ?? {}, pending: '' }))
    } catch (error) {
      setState(current => ({ ...current, pending: '', error: error instanceof Error ? error.message : copy.accountPinError }))
    }
  }

  const rows = state.accounts
    .filter(row => Array.isArray(row.names) && row.names.length > 1)
    .map(row => {
      const rep = reps.find(item => item.upstream === row.upstream)
      return {
        ...row,
        brandKey: rep?.brandKey ?? row.upstream,
        brandName: rep?.brandName ?? row.upstream,
      }
    })
  const probeError = state.accounts.find(row => typeof row.error === 'string' && row.error.length > 0)?.error

  return (
    <div>
      <div className="nms-compact-section-hint">{copy.accountPinHelp}</div>

      {state.status === 'loading' && <div className="nms-loading"><span className="nms-pending-dot" />{copy.accountPinLoading}</div>}
      {state.status === 'error' && (
        <div className="nms-error" role="alert">
          <WarningIcon size={14} />
          <span className="nms-error-copy">{state.error || copy.accountPinError}</span>
          <button type="button" className="nms-retry" onClick={load}>{copy.retry}</button>
        </div>
      )}
      {state.status === 'ready' && state.error !== '' && (
        <div className="nms-error" role="alert">
          <WarningIcon size={14} />
          <span className="nms-error-copy">{state.error}</span>
        </div>
      )}
      {state.status === 'ready' && rows.length === 0 && (
        <div className="nms-empty">
          <span className="nms-empty-icon"><AccountPinIcon size={17} /></span>
          {probeError ?? copy.accountPinEmpty}
        </div>
      )}
      {state.status === 'empty' && (
        <div className="nms-empty">
          <span className="nms-empty-icon"><AccountPinIcon size={17} /></span>
          {copy.accountPinEmpty}
        </div>
      )}

      {state.status === 'ready' && rows.map(row => (
        <div key={row.upstream}>
          <div className="nms-group">
            {row.brandName}
            <span className="nms-group-count">{copy.accountCount(row.names.length)}</span>
          </div>
          <AccountRow
            active={state.pins[row.upstream] === undefined}
            pending={state.pending === `${row.upstream}:`}
            brandKey={row.brandKey}
            brandName={row.brandName}
            name={copy.accountPinDefault}
            desc={row.brandName}
            onClick={() => choose(row.upstream, null)}
          />
          {row.names.map(name => (
            <AccountRow
              key={name}
              active={state.pins[row.upstream] === name}
              pending={state.pending === `${row.upstream}:${name}`}
              brandKey={row.brandKey}
              brandName={row.brandName}
              name={name}
              desc={row.brandName}
              onClick={() => choose(row.upstream, name)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
