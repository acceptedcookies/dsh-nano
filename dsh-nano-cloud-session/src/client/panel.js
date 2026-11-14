/** Cloud-session panel. Plain DOM inside the shell.overlay mount point.
 *  Canonical session state lives at the carrier; this panel is a view +
 *  control surface only, polling list/transcript at the configured cadence. */

import { api } from './api.js'

const CSS = `
.dncs { position: fixed; right: 24px; bottom: 88px; width: 520px; max-width: calc(100vw - 48px); height: 640px; max-height: calc(100vh - 160px);
  display: flex; flex-direction: column; border-radius: var(--dsw-radius-lg, 12px); overflow: hidden;
  background: var(--dsw-alias-bg-primary, #1b1d21); color: var(--dsw-alias-label-primary, #e8eaed);
  border: 1px solid var(--dsw-alias-border-primary, #33363c); box-shadow: 0 12px 40px rgba(0,0,0,.45);
  font: 13px/1.5 var(--dsw-font-family, system-ui, sans-serif); z-index: 60; }
.dncs * { box-sizing: border-box; }
.dncs-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--dsw-alias-border-primary, #33363c); }
.dncs-head b { font-size: 14px; }
.dncs-tabs { display: flex; gap: 4px; margin-left: auto; }
.dncs-tab { border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #9aa0a6); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.dncs-tab[data-on="1"] { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); color: var(--dsw-alias-label-primary, #e8eaed); }
.dncs-body { flex: 1; overflow: auto; padding: 12px 14px; }
.dncs-foot { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-top: 1px solid var(--dsw-alias-border-primary, #33363c); }
.dncs button { font: inherit; }
.dncs-btn { border: 1px solid var(--dsw-alias-border-primary, #33363c); background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-primary, #e8eaed); padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.dncs-btn:hover { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); }
.dncs-btn.primary { background: var(--dsw-alias-accent-primary, #4c8dff); border-color: transparent; color: #fff; }
.dncs-btn.danger { color: var(--dsw-alias-label-danger, #ff7b72); }
.dncs-btn[disabled] { opacity: .5; cursor: default; }
.dncs-row { padding: 8px 10px; border: 1px solid var(--dsw-alias-border-primary, #33363c); border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
.dncs-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); }
.dncs-row[data-selected="1"] { border-color: var(--dsw-alias-accent-primary, #4c8dff); }
.dncs-row .t { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dncs-row .m { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); display: flex; gap: 8px; flex-wrap: wrap; }
.dncs-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--dsw-alias-bg-secondary, #22252b); border: 1px solid var(--dsw-alias-border-primary, #33363c); }
.dncs-badge.running, .dncs-badge.claimed, .dncs-badge.working { color: #6ee7a0; }
.dncs-badge.suspended { color: #e8c46e; }
.dncs-badge.exit, .dncs-badge.archived { color: #9aa0a6; }
.dncs-field { margin-bottom: 10px; }
.dncs-field label { display: block; font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); margin-bottom: 4px; }
.dncs-field input, .dncs-field textarea, .dncs-field select { width: 100%; font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-primary, #33363c); background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-primary, #e8eaed); }
.dncs-field textarea { min-height: 88px; resize: vertical; }
.dncs-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); margin-top: 3px; }
.dncs-note { font-size: 12px; padding: 8px 10px; border-radius: 6px; background: var(--dsw-alias-bg-secondary, #22252b); margin-bottom: 10px; }
.dncs-note.err { color: var(--dsw-alias-label-danger, #ff7b72); }
.dncs-msg { padding: 8px 10px; border-radius: 8px; margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; }
.dncs-msg .who { font-size: 10px; color: var(--dsw-alias-label-secondary, #9aa0a6); margin-bottom: 3px; display: flex; gap: 8px; }
.dncs-msg.user { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); }
.dncs-msg.devin { background: var(--dsw-alias-bg-secondary, #22252b); }
.dncs-kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 12px; margin-bottom: 10px; }
.dncs-kv dt { color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-kv dd { margin: 0; overflow-wrap: anywhere; }
.dncs-prof { border: 1px solid var(--dsw-alias-border-primary, #33363c); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.dncs-prof .m { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-prof .acts { display: flex; gap: 6px; margin-top: 6px; }
.dncs-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.dncs-toolbar label { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); display: inline-flex; gap: 4px; align-items: center; }
.dncs-hidden { display: none !important; }
.dncs-msg-box { display: flex; gap: 8px; margin-top: 10px; }
.dncs-msg-box input { flex: 1; font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-primary, #33363c); background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-primary, #e8eaed); }
.dncs code { font-family: var(--dsw-font-mono, ui-monospace, monospace); font-size: 11px; background: var(--dsw-alias-bg-secondary, #22252b); padding: 1px 4px; border-radius: 4px; }
.dncs a { color: var(--dsw-alias-accent-primary, #4c8dff); }
`

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const ago = ts => { const s = Math.max(0, Date.now() / 1000 - ts); if (s < 60) return `${s | 0}s`; if (s < 3600) return `${s / 60 | 0}m`; if (s < 86400) return `${s / 3600 | 0}h`; return `${s / 86400 | 0}d` }

export function mountPanel(element, { t, pollIntervalMs = 5000 }) {
  const style = document.createElement('style')
  style.textContent = CSS
  element.append(style)

  const root = document.createElement('div')
  root.className = 'dncs dncs-hidden'
  element.append(root)

  const state = {
    tab: 'sessions',
    profiles: [], activeId: null, self: null,
    sessions: [], cursor: null, hasMore: false,
    selected: null, detail: null, transcript: [], transcriptAfter: null,
    showArchived: null, poll: true,
    busy: false, error: '',
  }

  let pollTimer = null

  function note() {
    return state.error ? `<div class="dncs-note err">${esc(t('error'))}: ${esc(state.error)}</div>` : ''
  }

  function badge(s) {
    const st = s?.status ?? 'unknown'
    const arch = s?.is_archived ? ` · ${t('archived')}` : ''
    return `<span class="dncs-badge ${esc(st)}">${esc(st)}${arch}</span>`
  }

  /* ---------- renders ---------- */

  function renderHead() {
    root.querySelector('.dncs-head').innerHTML = `
      <b>${esc(t('title'))}</b>
      <span class="dncs-tabs">
        <button class="dncs-tab" data-tab="sessions" data-on="${state.tab === 'sessions' || state.tab === 'detail' ? 1 : 0}">${esc(t('tabSessions'))}</button>
        <button class="dncs-tab" data-tab="new" data-on="${state.tab === 'new' ? 1 : 0}">${esc(t('tabNew'))}</button>
        <button class="dncs-tab" data-tab="settings" data-on="${state.tab === 'settings' ? 1 : 0}">${esc(t('tabSettings'))}</button>
      </span>`
  }

  function renderSessions() {
    const rows = state.sessions.map(s => `
      <div class="dncs-row" data-selected="${state.selected === s.session_id ? 1 : 0}" data-id="${esc(s.session_id)}">
        <div class="t">${esc(s.title || s.session_id)}</div>
        <div class="m">${badge(s)}<span>${esc(s.devin_mode ?? '')}</span><span>${ago(s.updated_at ?? s.created_at ?? 0)}</span><span>${esc(String(s.acus_consumed ?? '0'))} ACU</span></div>
      </div>`).join('')
    return `
      <div class="dncs-toolbar">
        <button class="dncs-btn" data-act="refresh">${esc(t('refresh'))}</button>
        <label><input type="checkbox" data-act="poll" ${state.poll ? 'checked' : ''}> ${esc(t('poll'))}</label>
        <label><input type="checkbox" data-act="archived" ${state.showArchived ? 'checked' : ''}> ${esc(t('showArchived'))}</label>
      </div>
      ${note()}
      ${state.sessions.length === 0 ? `<div class="dncs-note">${esc(t('empty'))}</div>` : rows}
      ${state.hasMore ? `<button class="dncs-btn" data-act="more">…</button>` : ''}
      <div class="dncs-detail-slot"></div>`
  }

  function renderDetail() {
    const d = state.detail
    if (!d) return ''
    const msgs = state.transcript.map(m => `
      <div class="dncs-msg ${esc(m.source)}">
        <div class="who"><span>${esc(m.source === 'user' ? t('role_user') : m.source === 'devin' ? t('role_devin') : t('role_system'))}</span><span>${m.username ? esc(m.username) : ''}</span><span>${ago(m.created_at ?? 0)}</span></div>
        <div>${esc(m.message)}</div>
      </div>`).join('')
    return `
      <div class="dncs-prof" style="margin-top:10px">
        <dl class="dncs-kv">
          <dt>id</dt><dd><code>${esc(d.session_id)}</code></dd>
          <dt>${esc(t('status'))}</dt><dd>${badge(d)} ${esc(d.status_detail ?? '')}</dd>
          <dt>ACU</dt><dd>${esc(String(d.acus_consumed ?? '0'))}</dd>
          <dt>mode</dt><dd>${esc(d.devin_mode ?? '')}</dd>
          <dt>url</dt><dd><a href="${esc(d.url)}" target="_blank" rel="noreferrer">${esc(d.url)}</a></dd>
        </dl>
        <div class="acts">
          <button class="dncs-btn" data-act="webapp">${esc(t('openInWebapp'))}</button>
          <button class="dncs-btn" data-act="ssh">${esc(t('sshCommand'))}</button>
          ${d.is_archived ? `<button class="dncs-btn" data-act="unarchive">${esc(t('unarchive'))}</button>` : `<button class="dncs-btn" data-act="archive">${esc(t('archive'))}</button>`}
          <button class="dncs-btn danger" data-act="terminate">${esc(t('terminate'))}</button>
        </div>
      </div>
      <div class="dncs-msgs">${msgs}</div>
      <div class="dncs-msg-box">
        <input type="text" data-msg placeholder="${esc(t('messagePlaceholder'))}">
        <button class="dncs-btn primary" data-act="send">${esc(t('send'))}</button>
      </div>`
  }

  function renderNew() {
    return `
      ${note()}
      <div class="dncs-field"><label>${esc(t('prompt'))} *</label><textarea data-f="prompt" placeholder="${esc(t('promptPlaceholder'))}"></textarea></div>
      <div class="dncs-field"><label>${esc(t('titleField'))}</label><input data-f="title" type="text"></div>
      <div class="dncs-field"><label>${esc(t('repos'))}</label><textarea data-f="repos" style="min-height:52px"></textarea><div class="dncs-hint">owner/repo — carrier 对 repos 只做浅校验，名字写错也会 200</div></div>
      <div class="dncs-field"><label>${esc(t('devinMode'))}</label>
        <select data-f="devin_mode"><option value="">default</option><option>lite</option><option>normal</option><option>fast</option><option>ultra</option><option>fusion</option></select></div>
      <div class="dncs-field"><label>${esc(t('maxAcu'))}</label><input data-f="max_acu_limit" type="number" min="0"></div>
      <div class="dncs-field"><label><input data-f="resumable" type="checkbox" checked> ${esc(t('resumable'))}</label></div>
      <button class="dncs-btn primary" data-act="create" ${state.busy ? 'disabled' : ''}>${esc(t('create'))}</button>`
  }

  function renderSettings() {
    const profs = state.profiles.map(p => `
      <div class="dncs-prof" data-active="${p.active}">
        <b>${esc(p.label)}</b>${p.active ? ` · <span class="dncs-badge running">${esc(t('active'))}</span>` : ''}
        <div class="m"><code>${esc(p.orgId)}</code> · ${esc(p.baseUrl)} · ${p.hasSecret ? 'token ••••' : 'no token'}</div>
        <div class="acts">
          <button class="dncs-btn" data-act="test" data-id="${esc(p.id)}">${esc(t('test'))}</button>
          ${p.active ? '' : `<button class="dncs-btn" data-act="activate" data-id="${esc(p.id)}">${esc(t('activate'))}</button>`}
          ${p.active ? '' : `<button class="dncs-btn danger" data-act="del-profile" data-id="${esc(p.id)}">${esc(t('delete'))}</button>`}
        </div>
      </div>`).join('')
    return `
      ${note()}
      ${state.profiles.length === 0 ? `<div class="dncs-note">${esc(t('noProfile'))}</div>` : profs}
      <div class="dncs-prof">
        <b>${esc(t('profileNew'))}</b>
        <div class="dncs-field" style="margin-top:8px"><label>${esc(t('label'))}</label><input data-p="label" type="text"></div>
        <div class="dncs-field"><label>${esc(t('orgId'))}</label><input data-p="orgId" type="text" placeholder="org-…"></div>
        <div class="dncs-field"><label>${esc(t('token'))}</label><input data-p="secret" type="password" placeholder="cog_…"><div class="dncs-hint">${esc(t('tokenHint'))}</div></div>
        <div class="dncs-field"><label>${esc(t('baseUrl'))}</label><input data-p="baseUrl" type="text" placeholder="https://api.devin.ai"></div>
        <button class="dncs-btn primary" data-act="save-profile">${esc(t('save'))}</button>
      </div>`
  }

  function render() {
    if (!root.querySelector('.dncs-head')) {
      root.innerHTML = `<div class="dncs-head"></div><div class="dncs-body"></div>`
    }
    renderHead()
    const body = root.querySelector('.dncs-body')
    if (state.tab === 'sessions') body.innerHTML = renderSessions()
    else if (state.tab === 'detail') body.innerHTML = renderSessions() // detail renders under list for context
    else if (state.tab === 'new') body.innerHTML = renderNew()
    else body.innerHTML = renderSettings()
    if (state.tab === 'sessions' || state.tab === 'detail') {
      const slot = body.querySelector('.dncs-detail-slot')
      if (slot && state.detail) slot.innerHTML = renderDetail()
    }
  }

  /* ---------- data ---------- */

  async function refreshProfiles() {
    const r = await api.status()
    state.profiles = r.profiles ?? []
    state.activeId = r.activeId ?? null
  }

  async function refreshSessions() {
    try {
      const r = await api.sessions({ first: 50, is_archived: state.showArchived === null ? null : state.showArchived })
      const items = r.items ?? r.sessions ?? []
      state.sessions = items
      state.hasMore = Boolean(r.has_next_page)
      state.cursor = r.end_cursor ?? null
      state.error = ''
    } catch (e) { state.error = e.message }
  }

  async function refreshDetail(id, { keepScroll } = {}) {
    try {
      const [d, m] = await Promise.all([
        api.session('get', { session_id: id }),
        api.session('messages', { session_id: id, first: 100 }),
      ])
      state.detail = d
      state.transcript = (m.items ?? m.messages ?? []).slice().sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0))
      state.error = ''
    } catch (e) { state.error = e.message }
  }

  function schedulePoll() {
    clearTimeout(pollTimer)
    if (!state.poll || state.tab === 'settings') return
    pollTimer = setTimeout(async () => {
      await refreshSessions()
      if (state.selected) await refreshDetail(state.selected)
      render(); schedulePoll()
    }, pollIntervalMs)
  }

  /* ---------- actions ---------- */

  root.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('.dncs-tab')
    if (tabBtn) { state.tab = tabBtn.dataset.tab; state.error = ''; render(); schedulePoll(); return }
    const row = e.target.closest('.dncs-row')
    const actEl = e.target.closest('[data-act]')
    if (row && !actEl) {
      state.selected = row.dataset.id
      state.tab = 'detail'
      await refreshDetail(state.selected)
      render(); return
    }
    if (!actEl) return
    const act = actEl.dataset.act
    try {
      switch (act) {
        case 'refresh': await refreshSessions(); break
        case 'poll': state.poll = actEl.checked; schedulePoll(); break
        case 'archived': state.showArchived = actEl.checked; await refreshSessions(); break
        case 'webapp': if (state.detail?.url) window.open(state.detail.url, '_blank', 'noreferrer'); return
        case 'ssh': {
          const r = await api.ssh(state.selected)
          await navigator.clipboard?.writeText(r.command).catch(() => {})
          state.error = `${r.command} — ${r.forwardHint}`
          break
        }
        case 'archive': await api.archive(state.selected); await refreshDetail(state.selected); await refreshSessions(); break
        case 'unarchive': await api.unarchive(state.selected); await refreshDetail(state.selected); await refreshSessions(); break
        case 'terminate':
          if (window.confirm(t('terminateConfirm'))) { await api.terminate(state.selected); state.selected = null; state.detail = null; state.tab = 'sessions'; await refreshSessions() }
          break
        case 'send': {
          const input = root.querySelector('[data-msg]')
          const text = input.value.trim()
          if (text) { await api.message(state.selected, text); input.value = ''; await refreshDetail(state.selected) }
          break
        }
        case 'create': {
          state.busy = true; render()
          const f = k => root.querySelector(`[data-f="${k}"]`)?.value ?? ''
          const repos = f('repos').split('\n').map(s => s.trim()).filter(Boolean)
          const r = await api.create({
            prompt: f('prompt'), title: f('title') || undefined,
            repos: repos.length ? repos : undefined,
            devin_mode: f('devin_mode') || undefined,
            max_acu_limit: f('max_acu_limit') ? Number(f('max_acu_limit')) : undefined,
            resumable: root.querySelector('[data-f="resumable"]')?.checked,
            tags: ['dsh-dncs'],
          })
          state.busy = false
          const id = r.session_id ?? r.id
          if (id) { state.selected = id; state.tab = 'detail'; await refreshDetail(id) }
          await refreshSessions()
          break
        }
        case 'save-profile': {
          const p = k => root.querySelector(`[data-p="${k}"]`)?.value.trim() ?? ''
          await api.config('save', { profile: { label: p('label'), orgId: p('orgId'), baseUrl: p('baseUrl') || undefined, secret: p('secret') || undefined } })
          await refreshProfiles(); break
        }
        case 'activate': await api.config('activate', { profileId: actEl.dataset.id }); await refreshProfiles(); break
        case 'del-profile': await api.config('remove', { profileId: actEl.dataset.id }); await refreshProfiles(); break
        case 'test': {
          const r = await api.config('test', { profileId: actEl.dataset.id })
          state.error = `ok: ${r.self?.principal_type ?? ''} ${r.self?.api_key_name ?? ''} ${r.self?.devin_sessions_org_id ?? ''}`
          break
        }
      }
      state.error = act === 'test' ? state.error : ''
    } catch (err) { state.error = err.message; state.busy = false }
    render()
  })

  /* ---------- boot ---------- */

  async function boot() {
    try {
      await refreshProfiles()
      if (state.activeId) await refreshSessions()
      state.error = ''
    } catch (e) { state.error = e.message }
    render(); schedulePoll()
  }
  boot()

  return {
    toggle() {
      const hidden = root.classList.toggle('dncs-hidden')
      if (!hidden) { refreshProfiles().then(refreshSessions).then(render).catch(() => {}); schedulePoll() }
      else clearTimeout(pollTimer)
      return hidden
    },
    setShortcut() {},
    stopTheme() {},
    failed(error) { state.error = String(error?.message ?? error); render() },
  }
}
