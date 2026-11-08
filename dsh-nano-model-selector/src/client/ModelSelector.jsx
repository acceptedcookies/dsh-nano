/** Browser half: a provider-filtered, searchable model selector with favorites and direct effort selection. */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { copyFor } from './i18n.js'
import { BrandMark } from './BrandMark.jsx'
import { readFavorites, writeFavorites } from './favorites.js'
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  GridIcon,
  ModelIcon,
  RefreshIcon,
  SearchIcon,
  StarIcon,
  WarningIcon,
} from './icons.jsx'
import { STYLE } from './styles.js'

const STYLE_ID = 'nano-model-selector-style'

/** One model row's fixed height. */
const MODEL_CARD_HEIGHT = 64

/** Gap kept below every row so a selected card never touches its neighbour. */
const MODEL_CARD_GAP = 4

/** Top bar, effort footer, list padding, and panel border around the rows. */
const PANEL_CHROME_HEIGHT = 58 + 46 + 18 + 2

/** @param {string} provider @param {string} model */
function keyOf(provider, model) {
  return `${provider}/${model}`
}

/** @param {number | undefined} value */
function formatTokens(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return ''
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace(/\.0$/u, '')}M`
  }
  if (value >= 1_000) {
    const thousands = value / 1_000
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1).replace(/\.0$/u, '')}K`
  }
  return String(value)
}

/** @param {any} details */
function detailsIndex(details) {
  const result = new Map()
  for (const group of details?.groups ?? []) {
    for (const model of group.models ?? []) result.set(keyOf(group.id, model.id), model)
  }
  return result
}

/** @param {any} text */
function textValue(text) {
  if (typeof text === 'string') return text
  if (text && typeof text === 'object') {
    const value = text.zh ?? text.en ?? Object.values(text)[0]
    return typeof value === 'string' ? value : ''
  }
  return ''
}

/** @param {any} item */
function reasoningOf(item) {
  return item?.details?.reasoning ?? item?.model?.reasoning
}

/** Friendly display names for model-id route prefixes used by gateway catalogs. */
const BRAND_NAMES = {
  auto: 'Auto',
  mistral: 'Mistral',
  workbuddy: 'WorkBuddy',
  cursor: 'Cursor',
  devin: 'Devin',
  deepseek: 'DeepSeek',
  'deepseek-official': 'DeepSeek',
  'deepseek-account': 'DeepSeek Account',
}

/** Split a gateway model id into the provider-like brand shown in the left rail. */
function brandOf(group, model) {
  const id = String(model.id ?? '')
  const slash = id.indexOf('/')
  const key = slash > 0 ? id.slice(0, slash) : group.id
  const mapped = BRAND_NAMES[key] ?? BRAND_NAMES[group.id]
  const name = mapped ?? key.replace(/[-_]+/gu, ' ').replace(/\b[a-z]/gu, char => char.toUpperCase())
  return { key, name }
}

/**
 * Render the composer model seat.
 * @param {object} props
 * @param {boolean} props.locked
 * @param {boolean} props.available
 * @param {any} props.directory
 * @param {() => void} props.load
 * @param {(selection: any) => Promise<any>} props.select
 * @param {{ current: () => string, subscribe: (listener: () => void) => (() => void) }} props.language
 * @param {(text: any) => string} props.resolveText
 */
export function ModelSelector({ locked, available, directory, load, select, language, resolveText }) {
  const [copy, setCopy] = React.useState(() => copyFor(language.current()))
  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const [favorites, setFavorites] = React.useState(() => readFavorites())
  const [details, setDetails] = React.useState(null)
  const [position, setPosition] = React.useState(null)
  const [toast, setToast] = React.useState(null)
  const triggerRef = React.useRef(null)
  const panelRef = React.useRef(null)
  const searchRef = React.useRef(null)
  const toastSeq = React.useRef(0)

  const state = React.useSyncExternalStore(
    listener => directory.store.subscribe(listener),
    () => directory.store.getSnapshot(),
  )

  React.useEffect(() => language.subscribe(() => setCopy(copyFor(language.current()))), [])
  React.useEffect(() => { if (available) load() }, [available])

  // The stylesheet belongs to the mounted selector, so disabling the plugin
  // takes its rules away with it instead of leaking them into the page.
  React.useEffect(() => {
    if (document.getElementById(STYLE_ID) !== null) return undefined
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = STYLE
    document.head.append(style)
    return () => { style.remove() }
  }, [])

  // A selection failure stays until its own timer clears it; the panel may be
  // closed or unmounted in between, so the timer lives on the toast identity.
  React.useEffect(() => {
    if (toast === null) return undefined
    const timer = window.setTimeout(() => { setToast(null) }, 6000)
    return () => { window.clearTimeout(timer) }
  }, [toast])

  React.useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    fetch('/nano-model-selector/catalog', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => response.ok ? response.json() : undefined)
      .then(value => { if (!cancelled) setDetails(value ?? null) })
      .catch(() => { /* The directory already carries the basic catalog. */ })
    return () => { cancelled = true }
  }, [open])

  const refreshDetails = React.useCallback(() => {
    fetch('/nano-model-selector/catalog', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => response.ok ? response.json() : undefined)
      .then(value => setDetails(value ?? null))
      .catch(() => { /* Keep the last good descriptions. */ })
  }, [])

  React.useEffect(() => {
    if (!open) return undefined
    const onPointer = event => {
      if (triggerRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer, true)
    return () => document.removeEventListener('pointerdown', onPointer, true)
  }, [open])

  React.useEffect(() => {
    if (!open) return undefined
    const onKey = event => {
      if (event.key !== 'Escape' || event.isComposing) return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  React.useEffect(() => {
    if (!open) return undefined
    const frame = requestAnimationFrame(() => {
      if (!window.matchMedia('(pointer: coarse)').matches) searchRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const detailMap = React.useMemo(() => detailsIndex(details), [details])
  const groups = React.useMemo(() => (state.groups ?? []).map(group => ({
    ...group,
    models: group.models.map(model => {
      const brand = brandOf(group, model)
      return {
        group,
        model,
        key: keyOf(group.id, model.id),
        brandKey: brand.key,
        brandName: brand.name,
        details: detailMap.get(keyOf(group.id, model.id)),
        reasoning: detailMap.get(keyOf(group.id, model.id))?.reasoning ?? model.reasoning,
      }
    }),
  })), [state.groups, detailMap])
  const allModels = React.useMemo(() => groups.flatMap(group => group.models), [groups])
  const brands = React.useMemo(() => {
    const seen = new Set()
    const result = []
    for (const item of allModels) {
      if (seen.has(item.brandKey)) continue
      seen.add(item.brandKey)
      result.push({
        key: item.brandKey,
        name: item.brandName,
        count: allModels.filter(candidate => candidate.brandKey === item.brandKey).length,
      })
    }
    return result
  }, [allModels])
  const favoriteSet = React.useMemo(() => new Set(favorites), [favorites])
  const favoriteItems = React.useMemo(() => favorites
    .map(key => allModels.find(item => item.key === key))
    .filter(Boolean), [favorites, allModels])

  const matches = React.useCallback(item => {
    if (filter === 'favorites') return favoriteSet.has(item.key)
    if (filter !== 'all' && item.brandKey !== filter) return false
    const wanted = query.trim().toLowerCase()
    if (wanted === '') return true
    const haystack = `${item.model.name} ${item.model.id} ${item.model.description ?? ''} ${item.brandName} ${item.group.name}`.toLowerCase()
    return haystack.includes(wanted)
  }, [filter, favoriteSet, query])

  const visibleFavorites = favoriteItems.filter(matches)
  const visibleGroups = brands
    .filter(brand => filter === 'all' || filter === brand.key)
    .map(brand => ({
      ...brand,
      models: allModels.filter(item => item.brandKey === brand.key && matches(item) && !favoriteSet.has(item.key)),
    }))
    .filter(group => group.models.length > 0)
  const visibleCount = visibleFavorites.length + visibleGroups.reduce((sum, group) => sum + group.models.length, 0)

  React.useLayoutEffect(() => {
    if (!open) return undefined
    const place = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const margin = 12
      const width = Math.min(440, window.innerWidth - margin * 2)
      const available = window.innerHeight - margin * 2
      // Fixed to 4.5 model cards so switching filters never resizes the
      // panel. Each card occupies its height plus the gap below it, followed
      // by the top bar, effort footer, list padding, and 2px border.
      const height = Math.min((MODEL_CARD_HEIGHT + MODEL_CARD_GAP) * 4.5 + PANEL_CHROME_HEIGHT, available)
      let left = Math.min(Math.max(margin, rect.right - width), Math.max(margin, window.innerWidth - width - margin))
      let top = rect.top - height - 8
      if (top < margin) top = Math.min(window.innerHeight - height - margin, rect.bottom + 8)
      if (top < margin) top = margin
      setPosition({ left, top, width, height })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const current = state.current
  const currentItem = current === null
    ? undefined
    : allModels.find(item => item.group.id === current.provider && item.model.id === current.model)
  const currentReasoning = reasoningOf(currentItem)
  const effectiveEffort = current?.reasoningEffort ?? currentReasoning?.defaultEffort
  const effortLabel = currentItem === undefined
    ? state.retainedEffort
    : currentReasoning === undefined
      ? state.retainedEffort
      : effectiveEffort === undefined
        ? copy.providerDefault
        : currentReasoning.efforts.find(level => level.id === effectiveEffort)?.name ?? effectiveEffort

  const triggerText = currentItem?.model.name ?? current?.model ?? (state.status === 'loading' ? copy.triggerLoading : copy.triggerSelect)
  const triggerAria = currentItem === undefined
    ? copy.triggerSelectAria
    : copy.triggerAria(triggerText, effortLabel)

  const busy = state.pending !== null
  const visible = Boolean(available)

  const refresh = () => {
    load()
    refreshDetails()
  }

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus())
  }

  const toggleFavorite = (key, event) => {
    event.preventDefault()
    event.stopPropagation()
    const next = favoriteSet.has(key)
      ? favorites.filter(item => item !== key)
      : [...favorites, key]
    setFavorites(next)
    writeFavorites(next)
  }

  const reportError = error => {
    toastSeq.current += 1
    setToast({ seq: toastSeq.current, text: `${copy.selectionError}: ${error instanceof Error ? error.message : String(error)}` })
  }

  const settle = (result, closeAfter) => {
    if (result === undefined) return
    if (result.ok) {
      if (closeAfter) close(true)
      return
    }
    toastSeq.current += 1
    setToast({ seq: toastSeq.current, text: `${copy.selectionError}: ${result.error.code}` })
  }

  const chooseModel = item => {
    if (busy) return
    if (current?.provider === item.group.id && current.model === item.model.id) {
      close(true)
      return
    }
    // Keep the popup open so the effort row for the newly selected model is
    // immediately available; choosing an effort is the action that closes it.
    void select({ provider: item.group.id, model: item.model.id }).then(result => settle(result, false)).catch(reportError)
  }

  const chooseEffort = effort => {
    if (busy || current === null) return
    if (effectiveEffort === effort) {
      close(true)
      return
    }
    void select({
      provider: current.provider,
      model: current.model,
      ...effort === undefined ? {} : { reasoningEffort: effort },
    }).then(result => settle(result, true)).catch(reportError)
  }

  const onPanelKeyDown = event => {
    if (event.nativeEvent.isComposing) return
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const rows = Array.from(panelRef.current?.querySelectorAll('button.nms-model-main:not(:disabled)') ?? [])
    if (rows.length === 0) return
    const active = rows.indexOf(document.activeElement)
    event.preventDefault()
    if (active === -1) {
      rows[event.key === 'ArrowDown' ? 0 : rows.length - 1]?.focus()
      return
    }
    rows[(active + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]?.focus()
  }

  const effortChoices = currentReasoning === undefined
    ? []
    : [
      ...(currentReasoning.defaultEffort === undefined
        ? [{ id: undefined, name: copy.providerDefault, description: undefined }]
        : []),
      ...currentReasoning.efforts,
    ]

  if (!visible) return null

  return (
    <div className="nms-root" data-nano-model-selector="root">
      <button
        ref={triggerRef}
        type="button"
        className={`nms-trigger${open ? ' nms-trigger-open' : ''}`}
        aria-label={triggerAria}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-busy={busy}
        title={effortLabel === undefined ? triggerText : `${triggerText} · ${effortLabel}`}
        disabled={locked}
        onClick={() => {
          if (open) close(true)
          else {
            setQuery('')
            setOpen(true)
            load()
          }
        }}
      >
        <ModelIcon className="nms-trigger-icon" size={15} />
        <span className="nms-trigger-label">{triggerText}</span>
        {effortLabel !== undefined && <span className="nms-trigger-effort">{effortLabel}</span>}
        {busy ? <span className="nms-trigger-busy" aria-hidden="true" /> : <ChevronDownIcon className="nms-trigger-chevron" />}
      </button>

      {open && createPortal(
        <div
          className="nms-panel"
          ref={panelRef}
          role="dialog"
          aria-label={copy.title}
          style={position === null ? { visibility: 'hidden' } : position}
          onKeyDown={onPanelKeyDown}
        >
          <div className="nms-top">
            <div className="nms-title">
              <span className="nms-title-icon"><ModelIcon size={16} /></span>
              <span className="nms-title-text">
                <span className="nms-title-main">{copy.title}</span>
                <span className="nms-title-sub">{copy.modelCount(allModels.length)}</span>
              </span>
            </div>
            <label className="nms-search">
              <SearchIcon size={14} />
              <input
                ref={searchRef}
                type="text"
                role="searchbox"
                value={query}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchPlaceholder}
                onChange={event => setQuery(event.target.value)}
              />
              {query !== '' && (
                <button type="button" className="nms-search-clear" aria-label={copy.searchClear} onClick={() => setQuery('')}>
                  <CloseIcon size={12} />
                </button>
              )}
            </label>
            <button type="button" className="nms-icon-button" title={copy.refresh} aria-label={copy.refresh} onClick={refresh} disabled={state.status === 'loading'}>
              <RefreshIcon size={16} />
            </button>
            <button type="button" className="nms-icon-button" title={copy.close} aria-label={copy.close} onClick={() => close(true)}>
              <CloseIcon size={16} />
            </button>
          </div>

          <div className="nms-body">
            <nav className="nms-rail" aria-label={copy.title}>
              <button
                type="button"
                className="nms-rail-item"
                data-active={filter === 'all'}
                title={copy.allProviders}
                aria-label={copy.allProviders}
                aria-pressed={filter === 'all'}
                onClick={() => { setFilter('all'); setQuery('') }}
              >
                <GridIcon size={17} />
              </button>
              <button
                type="button"
                className="nms-rail-item"
                data-active={filter === 'favorites'}
                data-favorite="true"
                title={copy.favorites}
                aria-label={copy.favorites}
                aria-pressed={filter === 'favorites'}
                onClick={() => { setFilter('favorites'); setQuery('') }}
              >
                <StarIcon size={17} filled={filter === 'favorites'} />
              </button>
              <span className="nms-rail-sep" aria-hidden="true" />
              {brands.map(brand => (
                <button
                  key={brand.key}
                  type="button"
                  className="nms-rail-item"
                  data-active={filter === brand.key}
                  title={`${brand.name} (${copy.modelCount(brand.count)})`}
                  aria-label={`${brand.name} (${copy.modelCount(brand.count)})`}
                  aria-pressed={filter === brand.key}
                  onClick={() => { setFilter(brand.key); setQuery('') }}
                >
                  <BrandMark brandKey={brand.key} brandName={brand.name} />
                </button>
              ))}
            </nav>

            <section className="nms-main">
              <div className="nms-scroll">
                {state.status === 'loading' && allModels.length === 0 && (
                  <div className="nms-loading"><span className="nms-pending-dot" />{copy.loading}</div>
                )}
                {state.error !== null && (
                  <div className="nms-error">
                    <WarningIcon size={14} />
                    <span className="nms-error-copy">{copy.loadError}: {state.error}</span>
                    <button type="button" className="nms-retry" onClick={refresh}>{copy.retry}</button>
                  </div>
                )}

                {visibleFavorites.length > 0 && (
                  <div>
                    <div className="nms-group"><StarIcon className="nms-group-star" size={12} filled />{copy.favorites}<span className="nms-group-count">{copy.favoriteCount(visibleFavorites.length)}</span></div>
                    {visibleFavorites.map(item => renderModel(item))}
                  </div>
                )}

                {filter !== 'favorites' && visibleGroups.map(group => (
                  <div key={group.id}>
                    <div className="nms-group">{group.name}<span className="nms-group-count">{copy.modelCount(group.models.length)}</span></div>
                    {group.models.map(item => renderModel(item))}
                  </div>
                ))}

                {visibleCount === 0 && state.status !== 'loading' && (
                  <div className="nms-empty">
                    <span className="nms-empty-icon">{filter === 'favorites' ? <StarIcon size={17} /> : <ModelIcon size={17} />}</span>
                    {filter === 'favorites' && favorites.length === 0
                      ? copy.noFavorites
                      : query !== '' ? copy.noMatches : copy.noModels}
                  </div>
                )}

                {(state.failures ?? []).map(failure => (
                  <div className="nms-error" key={failure.id}>
                    <WarningIcon size={14} />
                    <span className="nms-error-copy">{copy.providerFailure(failure.name, failure.message)}</span>
                    <button type="button" className="nms-retry" onClick={refresh}>{copy.retry}</button>
                  </div>
                ))}
              </div>

              <footer className="nms-effort">
                <span className="nms-effort-label">{copy.effort}</span>
                {current === null || currentItem === undefined
                  ? <span className="nms-effort-note">{copy.selectModel}</span>
                  : currentReasoning === undefined
                    ? <span className="nms-effort-note">{copy.noEffort}</span>
                    : (
                      <div className="nms-effort-list" role="group" aria-label={copy.effort}>
                        {effortChoices.map(level => (
                          <button
                            key={level.id ?? 'default'}
                            type="button"
                            className="nms-effort-button"
                            data-active={effectiveEffort === level.id}
                            title={level.description ?? level.name}
                            disabled={busy}
                            onClick={() => chooseEffort(level.id)}
                          >
                            {level.name}
                          </button>
                        ))}
                      </div>
                    )}
              </footer>
            </section>
          </div>
        </div>,
        document.body,
      )}

      {toast !== null && (
        <div className="nms-toast" role="status" key={toast.seq}>{toast.text}</div>
      )}
    </div>
  )

  function renderModel(item) {
    const selected = current?.provider === item.group.id && current.model === item.model.id
    const pending = state.pending?.provider === item.group.id && state.pending.model === item.model.id
    const context = formatTokens(item.details?.contextWindow)
    const maxOutput = formatTokens(item.details?.maxTokens)
    const inputs = item.details?.inputModalities
    const badge = item.model.badge ?? item.details?.badge
    const description = item.model.description ?? item.details?.description
    const meta = [
      item.brandName,
      context === '' ? '' : `${copy.context} ${context}`,
      maxOutput === '' ? '' : `${copy.maxOutput} ${maxOutput}`,
      ...(Array.isArray(inputs) ? inputs.map(value => value === 'image' ? copy.imageInput : value === 'text' ? copy.textInput : value) : []),
    ].filter(Boolean).join(' · ')
    return (
      <div className="nms-model-row" data-active={selected} data-pending={pending} key={item.key}>
        <button type="button" className="nms-model-main" disabled={busy} title={description ?? item.model.name} onClick={() => chooseModel(item)}>
          <span className="nms-model-mark"><BrandMark brandKey={item.brandKey} brandName={item.brandName} /></span>
          <span className="nms-model-copy">
            <span className="nms-model-line">
              <span className="nms-model-name">{item.model.name}</span>
              {badge !== undefined && <span className={`nms-tag nms-tag-${badge.tone ?? 'neutral'}`}>{resolveText(badge.text) || textValue(badge.text)}</span>}
              {context !== '' && <span className="nms-tag">{context}</span>}
            </span>
            <span className="nms-model-desc">{description ?? item.model.id}</span>
            <span className="nms-model-meta">{meta}</span>
          </span>
        </button>
        <span className="nms-model-side">
          {pending && <span className="nms-pending-dot" aria-label={copy.switching} />}
          {selected && !pending && <span className="nms-check"><CheckIcon size={16} /></span>}
          <button
            type="button"
            className="nms-star"
            data-active={favoriteSet.has(item.key)}
            title={favoriteSet.has(item.key) ? copy.unfavorite : copy.favorite}
            aria-label={favoriteSet.has(item.key) ? copy.unfavorite : copy.favorite}
            aria-pressed={favoriteSet.has(item.key)}
            onClick={event => toggleFavorite(item.key, event)}
          >
            <StarIcon size={15} filled={favoriteSet.has(item.key)} />
          </button>
        </span>
      </div>
    )
  }
}
