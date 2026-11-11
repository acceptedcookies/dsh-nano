/** Cloud endpoint management + the guarded switch wizard.
 *
 *  Mounted into the settings dialog's "Cloud" tab. Credentials are entered
 *  here but only ever POSTed to the host; the list endpoint returns
 *  `hasSecret`, never the key material. */
export function mountCloudSettings({ host, sync, copy, escapeHtml, onChanged, showError }) {
  const e = escapeHtml
  let profiles = []
  let activeId = null
  let prepared = null
  let busy = false

  host.innerHTML = `
    <div class="np-field"><div class="np-field-text"><span class="np-field-name">${e(copy.endpointCurrent)}</span><span class="np-field-desc">${e(copy.endpointSectionHint)}</span></div><span class="np-endpoint-current">—</span></div>
    <div class="np-endpoint-list"></div>
    <div class="np-field"><div class="np-field-text"><span class="np-field-name">${e(copy.endpointSection)}</span><span class="np-field-desc">${e(copy.endpointSecretHint)}</span></div><button type="button" data-cloud="new">${e(copy.endpointNew)}</button></div>
    <div class="np-endpoint-form" hidden></div>
    <div class="np-switch-wizard" hidden></div>`

  const listEl = host.querySelector('.np-endpoint-list')
  const currentEl = host.querySelector('.np-endpoint-current')
  const formEl = host.querySelector('.np-endpoint-form')
  const wizardEl = host.querySelector('.np-switch-wizard')

  function note(message, tone = '') {
    const el = host.querySelector('.np-cloud-note') ?? document.createElement('p')
    el.className = `np-cloud-note ${tone}`
    el.textContent = message
    if (!el.isConnected) host.append(el)
  }

  async function refresh() {
    const result = await sync.config('list')
    profiles = result.profiles ?? []
    activeId = result.activeId ?? null
    currentEl.textContent = profiles.find(p => p.id === activeId)?.label ?? '—'
    listEl.innerHTML = profiles.length
      ? profiles.map(p => `
        <div class="np-endpoint-row" data-active="${p.active}">
          <span class="np-endpoint-meta"><b>${e(p.label)}${p.active ? ` · ${e(copy.endpointActive)}` : ''}</b><small>${e(p.endpoint)} / ${e(p.bucket)} · ${p.hasSecret ? '••••' : e(copy.endpointNoSecret)}</small></span>
          ${p.active ? '' : `<button type="button" data-cloud="switch" data-id="${e(p.id)}">${e(copy.endpointSwitch)}</button>`}
          <button type="button" data-cloud="edit" data-id="${e(p.id)}">${e(copy.endpointEdit)}</button>
          ${p.active ? '' : `<button type="button" data-cloud="delete" data-id="${e(p.id)}">${e(copy.endpointDelete)}</button>`}
        </div>`).join('')
      : `<p class="np-cloud-note">${e(copy.endpointEmpty)}</p>`
    onChanged?.(result)
  }

  const FIELDS = [
    ['label', copy.endpointLabel, 'text', ''],
    ['endpoint', copy.endpointUrl, 'text', 'https://'],
    ['region', copy.endpointRegion, 'text', 'us-east-1'],
    ['bucket', copy.endpointBucket, 'text', ''],
    ['prefix', copy.endpointPrefix, 'text', 'notepad/'],
    ['accessKeyId', copy.endpointAccessKey, 'text', ''],
    ['secretAccessKey', copy.endpointSecret, 'password', ''],
  ]

  function openForm(profile) {
    const existing = profile ?? {}
    formEl.innerHTML = `
      <input type="hidden" name="id" value="${e(existing.id ?? '')}">
      ${FIELDS.map(([name, label, type, placeholder]) => `
        <label><span>${e(label)}</span><input name="${name}" type="${type}" value="${name === 'secretAccessKey' ? '' : e(existing[name] ?? placeholder)}" placeholder="${e(placeholder)}" autocomplete="off"></label>`).join('')}
      <label class="np-check"><input name="pathStyle" type="checkbox" ${existing.pathStyle !== false ? 'checked' : ''}> <span>${e(copy.endpointPathStyle)}</span></label>
      <div class="np-form-actions"><button type="button" data-cloud="save">${e(copy.endpointSave)}</button><button type="button" data-cloud="test-one">${e(copy.endpointTest)}</button><button type="button" data-cloud="cancel">${e(copy.endpointCancel)}</button></div>`
    formEl.hidden = false
    wizardEl.hidden = true
    formEl.scrollIntoView({ block: 'nearest' })
  }

  function formData() {
    const get = name => formEl.querySelector(`[name="${name}"]`)?.value ?? ''
    return {
      id: get('id') || undefined,
      label: get('label'), endpoint: get('endpoint'), region: get('region'),
      bucket: get('bucket'), prefix: get('prefix'),
      accessKeyId: get('accessKeyId'), secretAccessKey: get('secretAccessKey'),
      pathStyle: formEl.querySelector('[name="pathStyle"]')?.checked ?? true,
    }
  }

  function diffLabels(list) {
    return list.length ? list.slice(0, 6).join('、') + (list.length > 6 ? ` …+${list.length - 6}` : '') : '—'
  }

  function openWizard(result) {
    const d = result.diff
    const consistent = !d.onlyLocal.length && !d.onlyRemote.length && !d.conflict.length && !d.corrupt
    prepared = result
    wizardEl.innerHTML = `
      <div class="np-wizard-head">${e(copy.switchTitle)}</div>
      <p class="np-wizard-note">${e(copy.switchLocalTruth)}</p>
      ${d.corrupt ? `<p class="np-cloud-note error">${e(copy.switchCorrupt)}</p>` : ''}
      <div class="np-wizard-diff">
        <div><b>${e(copy.switchDiffOnlyLocal)} (${d.onlyLocal.length})</b><span>${e(diffLabels(d.onlyLocal))}</span></div>
        <div><b>${e(copy.switchDiffOnlyRemote)} (${d.onlyRemote.length})</b><span>${e(diffLabels(d.onlyRemote))}</span></div>
        <div><b>${e(copy.switchDiffConflict)} (${d.conflict.length})</b><span>${e(diffLabels(d.conflict))}</span></div>
        <div><b>${e(copy.switchDiffSame)} (${d.same.length})</b><span>${e(diffLabels(d.same))}</span></div>
      </div>
      ${consistent
        ? `<p class="np-wizard-ok">${e(copy.switchConsistent)}</p><input type="hidden" name="strategy" value="consistent">`
        : `<p class="np-wizard-warn">${e(copy.switchInconsistent)}</p>
           <label class="np-radio"><input type="radio" name="strategy" value="local" checked> <span>${e(copy.strategyLocal)}</span></label>
           <label class="np-radio"><input type="radio" name="strategy" value="remote"> <span>${e(copy.strategyRemote)}</span></label>
           <label class="np-radio"><input type="radio" name="strategy" value="merge"> <span>${e(copy.strategyMerge)}</span></label>`}
      <div class="np-form-actions"><button type="button" data-cloud="switch-confirm">${e(copy.switchConfirm)}</button><button type="button" data-cloud="switch-abort">${e(copy.switchAbort)}</button></div>
      <div class="np-wizard-result"></div>`
    wizardEl.hidden = false
    formEl.hidden = true
    wizardEl.scrollIntoView({ block: 'nearest' })
  }

  function setBusy(value, message) {
    busy = value
    for (const button of host.querySelectorAll('button')) button.disabled = value
    const result = wizardEl.querySelector('.np-wizard-result')
    if (result) result.textContent = message ?? ''
  }

  host.addEventListener('click', async event => {
    const target = event.target instanceof Element ? event.target.closest('[data-cloud]') : null
    if (!target || busy) return
    const action = target.dataset.cloud
    const id = target.dataset.id
    try {
      if (action === 'new') { openForm(null); return }
      if (action === 'cancel') { formEl.hidden = true; return }
      if (action === 'edit') { openForm(profiles.find(p => p.id === id)); return }
      if (action === 'save') {
        setBusy(true, copy.switchBusy)
        await sync.config('save', { profile: formData() })
        formEl.hidden = true
        await refresh()
        note(copy.endpointSaved)
        setBusy(false)
        return
      }
      if (action === 'test-one') {
        setBusy(true, copy.switchBusy)
        const probeId = formData().id
        const result = probeId ? await sync.config('probe', { id: probeId }) : { ok: false, reason: 'unsaved', message: copy.endpointSaveFirst }
        setBusy(false)
        note(result.ok ? `${copy.cloudReady} · ${result.latencyMs}ms` : String(result.message || copy.cloudNotReady), result.ok ? '' : 'error')
        return
      }
      if (action === 'delete') {
        setBusy(true, copy.switchBusy)
        await sync.config('delete', { id })
        await refresh()
        setBusy(false)
        return
      }
      if (action === 'switch') {
        setBusy(true, copy.switchStepProbe)
        const result = await sync.prepareSwitch(id)
        setBusy(false)
        if (!result.ok) { note(result.error, 'error'); return }
        note(copy.switchLocalTruth)
        openWizard(result)
        return
      }
      if (action === 'switch-abort') {
        sync.cancelSwitch()
        prepared = null
        wizardEl.hidden = true
        note(copy.switchAborted)
        await refresh()
        return
      }
      if (action === 'switch-confirm') {
        if (!prepared) return
        const strategy = wizardEl.querySelector('[name="strategy"]:checked, input[name="strategy"][type="hidden"]')?.value ?? 'consistent'
        setBusy(true, copy.switchBusy)
        const result = await sync.commitSwitch(prepared, strategy, step => {
          const r = wizardEl.querySelector('.np-wizard-result')
          if (r) r.textContent = step === 'begin' ? copy.switchBusy : ''
        })
        setBusy(false)
        prepared = null
        if (!result.ok) { note(result.error, 'error'); return }
        wizardEl.hidden = true
        note(copy.switchDone)
        await refresh()
        return
      }
    } catch (error) {
      setBusy(false)
      note(error instanceof Error ? error.message : String(error), 'error')
      showError?.(error)
    }
  })

  void refresh()
  return { refresh, note }
}
