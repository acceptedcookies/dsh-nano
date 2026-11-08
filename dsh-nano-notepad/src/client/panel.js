/** Floating notepad panel. Persistence lives in db.js; this file draws and routes gestures. */

import {
  CHANNEL,
  clearContent,
  commitVersion,
  counts,
  createNode,
  deleteNode,
  imageIdsIn,
  imagesById,
  loadSnapshot,
  moveNode,
  nextUntitled,
  normalizeSettings,
  openDatabase,
  renameNode,
  saveDraft,
  storeImage,
  versionsOf,
  writeSettings,
  writeUi,
} from './db.js'
import { applyFormat, renderMarkdown } from './markdown.js'

const STYLE = `
.np-layer { position: absolute; inset: 0; pointer-events: none; z-index: 30; }
.np-entry, .np-window { pointer-events: auto; position: absolute; }
.np-entry { width: 36px; height: 36px; border: 0; border-radius: 10px; background: #3a3a3a; color: #fff; cursor: grab; }
.np-entry:active { cursor: grabbing; }
.np-entry svg { width: 18px; height: 18px; display: block; margin: auto; }
.np-tip { position: absolute; right: 44px; top: 4px; white-space: nowrap; background: #fff; color: #222; border-radius: 8px; padding: 4px 8px; font: 12px/1.4 sans-serif; }
.np-window { width: min(920px, calc(100% - 48px)); height: min(640px, calc(100% - 48px)); display: flex; flex-direction: column; background: #1e1e1e; color: #e8e8e8; border-radius: 14px; box-shadow: 0 18px 50px rgba(0,0,0,.45); overflow: hidden; font: 13px/1.5 sans-serif; }
.np-window[data-theme="light"] { background: #f7f7f5; color: #222; }
.np-tabs { display: flex; align-items: center; gap: 6px; padding: 8px; cursor: grab; }
.np-tab { border: 0; background: transparent; color: inherit; padding: 4px 8px; border-bottom: 2px solid transparent; }
.np-tab[data-active="true"] { border-bottom-color: currentColor; }
.np-body { display: flex; min-height: 0; flex: 1; }
.np-tree { width: 210px; overflow: auto; border-right: 1px solid rgba(127,127,127,.3); padding: 8px; }
.np-editor { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.np-path, .np-toolbar, .np-status { display: flex; gap: 6px; align-items: center; padding: 6px 8px; }
.np-path { font-family: ui-monospace, monospace; font-size: 12px; opacity: .75; }
.np-path span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-toolbar button, .np-tree button, .np-status button, .np-tabs button, .np-dialog button { border: 0; background: transparent; color: inherit; border-radius: 6px; padding: 3px 6px; cursor: pointer; }
.np-toolbar button:hover, .np-tree button:hover, .np-status button:hover { background: rgba(127,127,127,.2); }
.np-write, .np-read { flex: 1; min-height: 0; margin: 0 8px 8px; }
.np-write { width: calc(100% - 16px); resize: none; border: 0; outline: 0; background: transparent; color: inherit; font: 14px/1.6 ui-monospace, monospace; }
.np-read { overflow: auto; padding: 8px 12px; }
.np-read img { max-width: 100%; }
.np-read .missing-image { border: 1px dashed currentColor; padding: 2px 4px; }
.np-node { display: flex; width: 100%; text-align: left; }
.np-node[data-active="true"] { background: rgba(127,127,127,.25); }
.np-dialog { position: absolute; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; pointer-events: auto; }
.np-card { width: min(420px, calc(100% - 32px)); background: #2a2a2a; color: #eee; border-radius: 12px; padding: 16px; }
.np-window[data-theme="light"] .np-card { background: #fff; color: #222; }
.np-card label { display: block; margin: 8px 0; }
.np-card input, .np-card select { margin-left: 8px; }
.np-versions { max-height: 240px; overflow: auto; }
.np-error { color: #ffb4b4; padding: 0 8px 8px; }
.np-slash { position: absolute; left: 230px; bottom: 72px; background: #2a2a2a; border-radius: 8px; padding: 6px; display: flex; flex-wrap: wrap; gap: 4px; max-width: 360px; }
.np-window[data-theme="light"] .np-slash { background: #fff; }
`

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z"></path><path d="M14 3.5V8h4.5"></path></svg>'

/** @param {ParentNode} root @param {string} selector */
function must(root, selector) {
  const node = root.querySelector(selector)
  if (!(node instanceof HTMLElement)) throw new Error(`notepad missing ${selector}`)
  return node
}

export function mountNotepad(host, defaults) {
  host.innerHTML = `<div class="np-layer"><button class="np-entry" type="button">${ICON}<span class="np-tip" hidden></span></button><section class="np-window" hidden></section></div>`
  const layer = must(host, '.np-layer')
  const entry = must(host, '.np-entry')
  const tip = must(host, '.np-tip')
  const panel = must(host, '.np-window')
  panel.innerHTML = `
    <div class="np-tabs"><button type="button" data-action="tree">收起</button><div class="np-tablist"></div><button type="button" data-action="new-file">+</button><span style="flex:1"></span><button type="button" data-action="theme">主题</button><button type="button" data-action="settings">设置</button><button type="button" data-action="close">收回</button></div>
    <div class="np-body">
      <aside class="np-tree"><div><button type="button" data-action="new-folder">新建文件夹</button><button type="button" data-action="new-file">新建文件</button><button type="button" data-action="rename">重命名</button><button type="button" data-action="delete">删除</button></div><div class="np-nodes" data-root="true"></div></aside>
      <div class="np-editor">
        <div class="np-path"><span class="np-pathname"></span><button type="button" data-action="view">渲染</button><button type="button" data-action="copy">复制路径</button><button type="button" data-action="history">历史版本</button><button type="button" data-action="settings">设置</button><button type="button" data-action="close">收回</button></div>
        <div class="np-toolbar">${['paragraph', 'h1', 'h2', 'h3', 'bold', 'italic', 'strike', 'bullet', 'numbered', 'task', 'quote', 'link'].map(kind => `<button type="button" data-format="${kind}">${kind}</button>`).join('')}<button type="button" data-action="image">图片</button></div>
        <textarea class="np-write" placeholder="Write markdown... Type / for blocks."></textarea>
        <div class="np-slash" hidden></div>
        <div class="np-read" hidden></div>
        <div class="np-error" hidden></div>
      </div>
    </div>
    <div class="np-dialog" hidden><div class="np-card"></div></div>
    <input class="np-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
  `
  const style = document.createElement('style')
  style.textContent = STYLE
  host.append(style)

  const state = {
    db: /** @type {IDBDatabase | null} */ (null),
    nodes: /** @type {any[]} */ ([]),
    settings: defaults,
    ui: { id: 'ui', open: false, tabs: /** @type {string[]} */ ([]), currentId: /** @type {string | null} */ (null), entryX: null, entryY: null, panelX: null, panelY: null },
    view: defaults.defaultView,
    slash: false,
    saveTimer: /** @type {number | undefined} */ (undefined),
    commitTimer: /** @type {number | undefined} */ (undefined),
    dirty: false,
  }

  const write = () => /** @type {HTMLTextAreaElement} */ (must(panel, '.np-write'))
  const current = () => state.nodes.find(node => node.id === state.ui.currentId && node.kind === 'file')

  function showError(error) {
    const node = must(panel, '.np-error')
    node.hidden = false
    const full = error?.name === 'QuotaExceededError'
    node.textContent = full ? '空间不够，这次没有写入。' : (error instanceof Error ? error.message : String(error))
  }

  function pathOf(id) {
    const names = []
    let cursor = state.nodes.find(node => node.id === id)
    const guard = new Set()
    while (cursor && !guard.has(cursor.id)) {
      guard.add(cursor.id)
      names.unshift(cursor.name)
      cursor = state.nodes.find(node => node.id === cursor.parentId)
    }
    return `/${names.join('/')}`
  }

  function place(node, x, y, fallbackRight) {
    const bounds = layer.getBoundingClientRect()
    const width = node.offsetWidth || 36
    const height = node.offsetHeight || 36
    const left = x ?? Math.max(8, bounds.width - width - (fallbackRight ?? 24))
    const top = y ?? Math.max(8, bounds.height - height - 24)
    node.style.left = `${Math.min(Math.max(8, left), Math.max(8, bounds.width - width - 8))}px`
    node.style.top = `${Math.min(Math.max(8, top), Math.max(8, bounds.height - height - 8))}px`
  }

  function renderTree() {
    const box = must(panel, '.np-nodes')
    const lines = []
    const visit = (parentId, depth) => {
      for (const node of state.nodes.filter(item => item.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name))) {
        lines.push(`<button class="np-node" type="button" draggable="true" data-id="${node.id}" data-active="${node.id === state.ui.currentId}" style="padding-left:${8 + depth * 14}px">${node.kind === 'folder' ? '▸ ' : ''}${node.name}</button>`)
        if (node.kind === 'folder') visit(node.id, depth + 1)
      }
    }
    visit(null, 0)
    box.innerHTML = lines.join('')
  }

  function renderTabs() {
    const box = must(panel, '.np-tablist')
    box.innerHTML = state.ui.tabs.map(id => {
      const node = state.nodes.find(item => item.id === id)
      if (!node) return ''
      return `<button class="np-tab" type="button" data-tab="${id}" data-active="${id === state.ui.currentId}">${node.name} <span data-close="${id}">×</span></button>`
    }).join('')
  }

  async function renderBody() {
    const file = current()
    must(panel, '.np-pathname').textContent = file ? pathOf(file.id) : '未打开文件'
    const source = write()
    const read = must(panel, '.np-read')
    if (!file) {
      source.value = ''
      source.disabled = true
      read.hidden = true
      return
    }
    source.disabled = state.db === null
    if (document.activeElement !== source && !state.dirty) source.value = file.draft ?? ''
    const rendered = state.view === 'rendered'
    source.hidden = rendered
    read.hidden = !rendered
    must(panel, '[data-action="view"]').textContent = rendered ? '源码' : '渲染'
    if (!rendered || state.db === null) return
    const images = await imagesById(state.db, imageIdsIn(file.draft ?? ''))
    const markdown = file.draft ?? ''
    read.innerHTML = markdown === ''
      ? '<p class="np-placeholder">Write markdown... Type / for blocks.</p>'
      : renderMarkdown(markdown, images)
  }

  function render() {
    panel.hidden = !state.ui.open
    panel.dataset.theme = state.settings.theme === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : state.settings.theme
    renderTree()
    renderTabs()
    void renderBody()
    requestAnimationFrame(() => {
      place(entry, state.ui.entryX, state.ui.entryY, 72)
      place(panel, state.ui.panelX, state.ui.panelY, 80)
    })
  }

  async function persistUi() {
    if (state.db) await writeUi(state.db, state.ui)
  }

  function openFile(id) {
    if (!state.ui.tabs.includes(id)) state.ui.tabs.push(id)
    state.ui.currentId = id
    state.ui.open = true
    state.dirty = false
    render()
    void persistUi()
  }

  function selectedParent() {
    const selected = state.nodes.find(node => node.id === state.ui.currentId)
    return selected?.kind === 'folder' ? selected.id : selected?.parentId ?? null
  }

  async function add(kind) {
    if (!state.db) return
    const parentId = selectedParent()
    const siblings = state.nodes.filter(node => node.parentId === parentId)
    const name = kind === 'file' ? nextUntitled(siblings) : `folder-${siblings.length + 1}`
    const node = await createNode(state.db, kind, parentId, name)
    state.nodes.push(node)
    if (kind === 'file') openFile(node.id)
    else { state.ui.currentId = node.id; render() }
    channel?.postMessage({ type: 'changed' })
  }

  function askName(title, initial, done) {
    dialog(`<h3>${title}</h3><input name="node-name" value="${initial.replace(/"/gu, '&quot;')}"><button type="button" data-go="cancel">取消</button><button type="button" data-go="ok">确定</button>`, (card, close) => {
      const input = card.querySelector('[name="node-name"]')
      input.focus()
      card.addEventListener('click', event => {
        const action = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (action === 'cancel') close()
        if (action === 'ok') {
          close()
          void done(input.value).catch(showError)
        }
      })
    })
  }

  function scheduleSave() {
    state.dirty = true
    window.clearTimeout(state.saveTimer)
    state.saveTimer = window.setTimeout(() => {
      const file = current()
      if (!file || !state.db) return
      const draft = write().value
      file.draft = draft
      void saveDraft(state.db, file.id, draft).then(() => {
        state.dirty = false
        channel?.postMessage({ type: 'changed', fileId: file.id })
      }).catch(showError)
    }, state.settings.saveDelayMs)
  }

  async function commit(reason) {
    const file = current()
    if (!file || !state.db) return null
    if (state.dirty) {
      file.draft = write().value
      await saveDraft(state.db, file.id, file.draft)
      state.dirty = false
    }
    const text = file.draft ?? ''
    if (text === '' && reason === 'interval') return null
    return commitVersion(state.db, file.id, text, reason, state.settings.versionLimit)
  }

  async function forget(id) {
    if (!state.db) return
    await deleteNode(state.db, id)
    const removed = new Set([id])
    let grew = true
    while (grew) {
      grew = false
      for (const node of state.nodes) {
        if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
          removed.add(node.id)
          grew = true
        }
      }
    }
    state.nodes = state.nodes.filter(node => !removed.has(node.id))
    state.ui.tabs = state.ui.tabs.filter(tab => !removed.has(tab))
    if (state.ui.currentId && removed.has(state.ui.currentId)) state.ui.currentId = state.ui.tabs.at(-1) ?? null
    render()
    void persistUi()
    channel?.postMessage({ type: 'changed' })
  }

  async function clearCurrentFile() {
    const file = current()
    if (!file || !state.db) return
    file.draft = ''
    write().value = ''
    state.dirty = false
    await commit('manual')
    render()
  }

  function armCommit() {
    window.clearInterval(state.commitTimer)
    state.commitTimer = window.setInterval(() => {
      if (state.ui.open) void commit('interval').catch(showError)
    }, state.settings.commitIntervalSec * 1000)
  }

  function dialog(html, setup) {
    const mask = must(panel, '.np-dialog')
    const card = must(panel, '.np-card')
    card.innerHTML = html
    mask.hidden = false
    setup(card, () => { mask.hidden = true })
  }

  function openSettings() {
    const values = state.settings
    dialog(`<h3>便签设置</h3>
      <label>自动保存延迟（毫秒）<input name="saveDelayMs" type="number" min="200" max="5000" value="${values.saveDelayMs}"></label>
      <label>自动提交间隔（秒）<input name="commitIntervalSec" type="number" min="15" max="3600" value="${values.commitIntervalSec}"></label>
      <label>每个文件保留版本数<input name="versionLimit" type="number" min="5" max="500" value="${values.versionLimit}"></label>
      <label>单张图片上限（字节）<input name="imageLimitBytes" type="number" min="262144" max="20971520" value="${values.imageLimitBytes}"></label>
      <label>打开文件时的视图<select name="defaultView"><option value="rendered">渲染</option><option value="source">源码</option></select></label>
      <label>浮窗主题<select name="theme"><option value="dark">深色</option><option value="light">浅色</option><option value="system">跟随应用</option></select></label>
      <p class="np-usage"></p>
      <button type="button" data-go="save-version">保存版本</button>
      <button type="button" data-go="clear-file">清空当前文件</button>
      <button type="button" data-go="reset-position">重置位置</button>
      <button type="button" data-go="clear">清空全部内容</button>
      <button type="button" data-go="close">关闭</button>`, (card, close) => {
      card.querySelector('[name="defaultView"]').value = values.defaultView
      card.querySelector('[name="theme"]').value = values.theme
      if (state.db) void counts(state.db).then(async value => {
        const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : {}
        must(card, '.np-usage').textContent = `文件 ${value.files}，版本 ${value.versions}，图片 ${value.images}，已用 ${estimate.usage ?? '未知'} 字节`
      })
      card.addEventListener('click', event => {
        const action = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (action === 'close') close()
        if (action === 'save-version') void commit('manual').catch(showError)
        if (action === 'clear-file') void clearCurrentFile().catch(showError)
        if (action === 'reset-position') {
          state.ui.entryX = null
          state.ui.entryY = null
          state.ui.panelX = null
          state.ui.panelY = null
          render()
          void persistUi()
        }
        if (action === 'clear') confirmClear(close)
      })
      card.addEventListener('change', () => {
        const next = {}
        for (const input of card.querySelectorAll('input, select')) next[input.name] = input.type === 'number' ? Number(input.value) : input.value
        const merged = { ...state.settings }
        let rejected = false
        for (const [key, value] of Object.entries(next)) {
          const trial = normalizeSettings({ ...state.settings, [key]: value })
          if (trial[key] === value) merged[key] = value
          else rejected = true
        }
        state.settings = merged
        for (const input of card.querySelectorAll('input, select')) input.value = merged[input.name]
        if (rejected) showError(new Error('notepad kept the previous valid setting'))
        if (state.db) void writeSettings(state.db, merged).catch(showError)
        armCommit()
        render()
      })
    })
  }

  function confirmClear(closeSettings) {
    dialog('<h3>清空全部内容</h3><p>文件夹、文件、历史版本和图片都会删除。数据只在这台浏览器的这个网站里，删除后不能恢复。</p><button type="button" data-go="cancel">取消</button><button type="button" data-go="confirm">删除全部</button>', (card, close) => {
      card.querySelector('[data-go="cancel"]').focus()
      card.addEventListener('click', event => {
        const action = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (action === 'cancel') close()
        if (action === 'confirm' && state.db) {
          void clearContent(state.db).then(() => {
            state.nodes = []
            state.ui.tabs = []
            state.ui.currentId = null
            close()
            closeSettings()
            render()
          }).catch(showError)
        }
      })
    })
  }

  async function openHistory() {
    const file = current()
    if (!file || !state.db) return
    const versions = await versionsOf(state.db, file.id)
    const reasons = { interval: '自动', manual: '手动', restore: '回退' }
    const rows = versions.map(version => `<button type="button" data-version="${version.id}">${new Date(version.createdAt).toLocaleString()} · ${reasons[version.reason] ?? version.reason} · ${version.markdown.length}</button>`).join('')
    dialog(`<h3>历史版本</h3><div class="np-versions">${rows || '<p>还没有版本</p>'}</div><button type="button" data-go="close">关闭</button>`, (card, close) => {
      card.addEventListener('click', event => {
        const target = event.target instanceof HTMLElement ? event.target : null
        if (target?.dataset.go === 'close') close()
        const id = target?.dataset.version
        const version = versions.find(item => item.id === id)
        if (!version) return
        dialog(`<h3>预览 ${new Date(version.createdAt).toLocaleString()}</h3><pre>${version.markdown.replace(/[&<>]/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])}</pre><button type="button" data-go="back">返回</button><button type="button" data-go="restore">回退到这一版</button>`, (preview, closePreview) => {
          preview.addEventListener('click', previewEvent => {
            const action = previewEvent.target instanceof HTMLElement ? previewEvent.target.dataset.go : undefined
            if (action === 'back') closePreview()
            if (action === 'restore') {
              write().value = version.markdown
              const live = current()
              if (live) live.draft = version.markdown
              void commit('restore').then(() => { closePreview(); close(); render() }).catch(showError)
            }
          })
        })
      })
    })
  }

  function drag(node, onEnd) {
    let startX = 0
    let startY = 0
    let originX = 0
    let originY = 0
    let moved = false
    const move = event => {
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.hypot(dx, dy) > 4) moved = true
      place(node, originX + dx, originY + dy)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onEnd(moved, node.offsetLeft, node.offsetTop)
    }
    node.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, a') && event.target !== node) return
      startX = event.clientX
      startY = event.clientY
      originX = node.offsetLeft
      originY = node.offsetTop
      moved = false
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    })
  }

  drag(entry, (moved, x, y) => {
    if (moved) {
      state.ui.entryX = x
      state.ui.entryY = y
      void persistUi()
      return
    }
    state.ui.open = !state.ui.open
    render()
    void persistUi()
    if (state.ui.open) write().focus()
  })
  const tree = must(panel, '.np-tree')
  tree.addEventListener('dragstart', event => {
    const row = event.target instanceof HTMLElement ? event.target.closest('[data-id]') : null
    if (!row || !event.dataTransfer) return
    event.dataTransfer.setData('text/plain', row.dataset.id ?? '')
    event.dataTransfer.effectAllowed = 'move'
  })
  tree.addEventListener('dragover', event => { event.preventDefault() })
  tree.addEventListener('drop', event => {
    event.preventDefault()
    const id = event.dataTransfer?.getData('text/plain')
    if (!id || !state.db) return
    const row = event.target instanceof HTMLElement ? event.target.closest('[data-id]') : null
    const target = row ? state.nodes.find(node => node.id === row.dataset.id) : null
    const parentId = target ? (target.kind === 'folder' ? target.id : target.parentId) : null
    void moveNode(state.db, id, parentId).then(moved => {
      const node = state.nodes.find(item => item.id === id)
      if (node) node.parentId = moved.parentId
      render()
      channel?.postMessage({ type: 'changed' })
    }).catch(showError)
  })
  drag(must(panel, '.np-tabs'), (moved, x, y) => {
    if (!moved) return
    state.ui.panelX = x
    state.ui.panelY = y
    void persistUi()
  })

  panel.addEventListener('click', event => {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (!target) return
    const action = target.dataset.action
    if (action === 'close') { state.ui.open = false; render(); void persistUi() }
    if (action === 'settings') openSettings()
    if (action === 'theme') {
      state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark'
      if (state.db) void writeSettings(state.db, state.settings)
      render()
    }
    if (action === 'new-file') void add('file').catch(showError)
    if (action === 'new-folder') void add('folder').catch(showError)
    if (action === 'rename' && state.ui.currentId) {
      const node = state.nodes.find(item => item.id === state.ui.currentId)
      if (node && state.db) askName('重命名', node.name, async name => {
        const renamed = await renameNode(state.db, node.id, name)
        Object.assign(node, renamed)
        render()
      })
    }
    if (action === 'delete' && state.ui.currentId && state.db) {
      const id = state.ui.currentId
      const node = state.nodes.find(item => item.id === id)
      const nested = state.nodes.some(item => item.parentId === id)
      if (node?.kind === 'folder' && nested) {
        dialog('<h3>删除文件夹</h3><p>这个文件夹里还有文件或子文件夹。确认后会一并删除，包括它们的历史版本。</p><button type="button" data-go="cancel">取消</button><button type="button" data-go="confirm">删除</button>', (card, close) => {
          card.querySelector('[data-go="cancel"]').focus()
          card.addEventListener('click', click => {
            const choice = click.target instanceof HTMLElement ? click.target.dataset.go : undefined
            if (choice === 'cancel') close()
            if (choice === 'confirm') { close(); void forget(id) }
          })
        })
      } else void forget(id)
    }
    if (action === 'clear-file') void clearCurrentFile().catch(showError)
    if (action === 'tree') {
      const column = must(panel, '.np-tree')
      const hidden = column.dataset.collapsed === 'true'
      column.dataset.collapsed = hidden ? 'false' : 'true'
      column.style.display = hidden ? '' : 'none'
      target.textContent = hidden ? '收起' : '文件'
    }
    if (action === 'view') { state.view = state.view === 'rendered' ? 'source' : 'rendered'; void renderBody() }
    if (action === 'copy') void navigator.clipboard?.writeText(must(panel, '.np-pathname').textContent ?? '')
    if (action === 'history') void openHistory().catch(showError)
    if (action === 'image') must(panel, '.np-file').click()
    const format = target.dataset.format
    if (format) {
      const source = write()
      const applied = applyFormat(source.value, source.selectionStart, source.selectionEnd, format)
      source.value = applied.text
      source.setSelectionRange(applied.cursor, applied.cursor)
      scheduleSave()
    }
    const tab = target.dataset.tab ?? target.dataset.close
    if (target.dataset.close) {
      state.ui.tabs = state.ui.tabs.filter(id => id !== target.dataset.close)
      if (state.ui.currentId === target.dataset.close) state.ui.currentId = state.ui.tabs.at(-1) ?? null
      render(); void persistUi()
    } else if (target.dataset.tab) openFile(tab)
    const id = target.dataset.id
    if (id) {
      const node = state.nodes.find(item => item.id === id)
      if (node?.kind === 'file') openFile(id)
      else { state.ui.currentId = id; render() }
    }
  })
  const slashKinds = ['paragraph', 'h1', 'h2', 'h3', 'bold', 'italic', 'strike', 'bullet', 'numbered', 'task', 'quote', 'link']
  const slashMenu = must(panel, '.np-slash')
  slashMenu.innerHTML = [...slashKinds, 'image'].map(kind => `<button type="button" data-slash="${kind}">${kind}</button>`).join('')
  function slashOpen() {
    const source = write()
    const before = source.value.slice(0, source.selectionStart)
    return before.endsWith('\n/') || before === '/'
  }
  write().addEventListener('input', () => {
    state.slash = slashOpen()
    slashMenu.hidden = !state.slash
    scheduleSave()
  })
  function insertSlash(kind) {
    const source = write()
    source.setRangeText('', source.selectionStart - 1, source.selectionStart)
    state.slash = false
    slashMenu.hidden = true
    const applied = applyFormat(source.value, source.selectionStart, source.selectionStart, kind)
    source.value = applied.text
    source.setSelectionRange(applied.cursor, applied.cursor)
    scheduleSave()
  }
  write().addEventListener('keydown', event => {
    if (!state.slash) return
    if (event.key === 'Escape') {
      state.slash = false
      slashMenu.hidden = true
      return
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    insertSlash('bullet')
  })
  slashMenu.addEventListener('click', event => {
    const kind = event.target instanceof HTMLElement ? event.target.dataset.slash : undefined
    if (kind === 'image') must(panel, '.np-file').click()
    else if (kind) insertSlash(kind)
    state.slash = false
    slashMenu.hidden = true
  })
  panel.addEventListener('click', event => {
    if (!(event.target instanceof HTMLElement) || event.target.closest('.np-slash')) return
    if (state.slash && event.target !== write()) {
      state.slash = false
      slashMenu.hidden = true
    }
  })
  must(panel, '.np-file').addEventListener('change', event => {
    const input = /** @type {HTMLInputElement} */ (event.target)
    const file = input.files?.[0]
    input.value = ''
    if (!file || !state.db) return
    void storeImage(state.db, file, state.settings.imageLimitBytes).then(image => {
      const source = write()
      source.setRangeText(`![${file.name}](notepad-image:${image.id})`, source.selectionStart, source.selectionEnd, 'end')
      scheduleSave()
    }).catch(showError)
  })
  function insertStoredImage(file) {
    if (!state.db) return
    void storeImage(state.db, file, state.settings.imageLimitBytes).then(image => {
      const source = write()
      source.setRangeText(`![${file.name || 'image'}](notepad-image:${image.id})`, source.selectionStart, source.selectionEnd, 'end')
      state.view = 'source'
      scheduleSave()
      void renderBody()
    }).catch(showError)
  }
  panel.addEventListener('dragover', event => {
    if ([...(event.dataTransfer?.files ?? [])].some(file => file.type.startsWith('image/'))) event.preventDefault()
  })
  panel.addEventListener('drop', event => {
    const image = [...(event.dataTransfer?.files ?? [])].find(file => file.type.startsWith('image/'))
    if (!image) return
    event.preventDefault()
    event.stopPropagation()
    insertStoredImage(image)
  })
  panel.addEventListener('paste', event => {
    const image = [...(event.clipboardData?.files ?? [])].find(file => file.type.startsWith('image/'))
    if (!image || !state.db) return
    event.preventDefault()
    void storeImage(state.db, image, state.settings.imageLimitBytes).then(stored => {
      const source = write()
      source.setRangeText(`![image](notepad-image:${stored.id})`, source.selectionStart, source.selectionEnd, 'end')
      scheduleSave()
    }).catch(showError)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void commit('interval').catch(showError)
  })
  window.addEventListener('resize', () => render())

  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  channel?.addEventListener('message', event => {
    if (state.dirty && event.data?.fileId === state.ui.currentId) {
      showError(new Error('其他标签页已更新这个文件'))
      return
    }
    if (state.db) void loadSnapshot(state.db).then(snapshot => {
      state.nodes = snapshot.nodes
      state.settings = { ...defaults, ...snapshot.settings }
      render()
    })
  })

  const api = {
    toggle() {
      state.ui.open = !state.ui.open
      render()
      void persistUi()
      if (state.ui.open) write().focus()
    },
    setShortcut(label, keys) {
      entry.title = label
      entry.setAttribute('aria-label', label)
      if (keys) entry.setAttribute('aria-keyshortcuts', keys)
      tip.textContent = label
    },
    failed(error) {
      state.db = null
      write().disabled = true
      showError(error)
    },
  }
  entry.addEventListener('pointerenter', () => { tip.hidden = false })
  entry.addEventListener('pointerleave', () => { tip.hidden = true })

  void openDatabase().then(async db => {
    state.db = db
    const snapshot = await loadSnapshot(db)
    state.nodes = snapshot.nodes
    state.settings = { ...defaults, ...snapshot.settings }
    state.ui = { ...state.ui, ...snapshot.ui, tabs: snapshot.ui.tabs ?? [] }
    state.view = state.settings.defaultView
    armCommit()
    render()
    void navigator.storage?.persist?.()
  }).catch(error => api.failed(error))
  render()
  return api
}
