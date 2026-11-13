/** Right-workspace browser. The page is the canvas; annotate picks on it. */

const React = require('react')
const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
const { openNanoDialog, openNanoMenu, NANO_STYLES, NanoToast } = require('dsh-nano-ui')
const { ensurePerfReview, LIB_VERSION } = require('dsh-performance-review/client')
const { copyFor } = require('./i18n.js')
const { batchNote, designNote, multiNote } = require('../shared/note.js')
const { contentFrame, shotPoint } = require('../shared/shot-point.js')
const h = React.createElement

const STATUS = '/nano-kitesurf/status'
const OPEN = '/nano-kitesurf/open'
const SHOT = '/nano-kitesurf/shot'
const PICK = '/nano-kitesurf/pick'
const EDIT = '/nano-kitesurf/edit'
const SETTINGS = '/nano-kitesurf/settings'
const KITE = '/nano-kitesurf/kite'
const KIND = 'kitesurf'
const OWN_ID = 'nano-kitesurf'
const MAX_PINS = 8

const perfReview = ensurePerfReview()
perfReview.configure({ hostSnapshotUrl: '/nano-kitesurf/perf-review/host?mode=snapshot' })
const perf = perfReview.join(OWN_ID, {
  // Baked at build time by scripts/build-client.mjs `define`; the fallback
  // keeps an unbundled src/ loadable in tests.
  version: typeof __NKS_VERSION__ === 'string' ? __NKS_VERSION__ : '0.0.0',
  libVersion: LIB_VERSION,
  react: React,
  root: () => document.querySelector('[data-nks-workspace]'),
})

const STYLE = `
.nks-root{position:relative;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;flex:auto;display:flex;font:var(--dsw-font-xxs-12)}
.nks-toolbar{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:4px;height:38px;padding:5px 6px;display:flex}
.nks-tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;background:transparent;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}
.nks-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.nks-tool:disabled{color:var(--dsw-alias-label-quaternary);cursor:default}
.nks-tool:focus-visible,.nks-address:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,var(--dsw-alias-link));outline-offset:1px}
.nks-tool[aria-pressed="true"]{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-link)) 18%,transparent)}
.nks-address-box{flex:auto;min-width:0;position:relative}
.nks-address{box-sizing:border-box;width:100%;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 32px 0 9px}
.nks-address::placeholder{color:var(--dsw-alias-label-tertiary)}
.nks-go{visibility:hidden;opacity:0;position:absolute;top:0;right:0}
.nks-address-box:focus-within .nks-go,.nks-address-box[data-dirty="true"] .nks-go{visibility:visible;opacity:1}
.nks-frame{position:relative;flex:auto;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.nks-frame img{width:100%;height:100%;object-fit:contain;object-position:top center;display:block}
.nks-empty{height:100%;margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);justify-content:center;align-items:center;display:flex}
.nks-box{position:absolute;border:1.5px solid var(--dsw-alias-brand-primary,var(--dsw-alias-link));box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-bg-base) 55%,transparent);pointer-events:none}
.nks-box[data-kind="ellipse"]{border-radius:50%}
.nks-box[data-kind="hover"]{border-style:dashed;opacity:.75}
.nks-pin-dot{position:absolute;width:18px;height:18px;margin-left:-9px;margin-top:-9px;color:#fff;font:var(--dsw-font-xxxs-11);line-height:18px;text-align:center;background:var(--dsw-alias-brand-primary,var(--dsw-alias-link));border-radius:50%;pointer-events:auto;cursor:pointer;user-select:none}
.nks-pin-dot:hover{background:var(--dsw-alias-fill-error,#d5455c);transform:scale(1.15)}
.nks-hint{flex:none;padding:3px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:6px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-hint-text{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-start{position:absolute;inset:0;justify-content:center;align-items:center;display:flex}
.nks-start-btn{height:30px;padding:0 14px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);cursor:pointer}
.nks-start-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-inspector{flex:none;padding:3px 8px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;gap:10px;overflow:hidden;border-top:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.nks-inspector b{font-weight:500;color:var(--dsw-alias-label-secondary)}
.nks-inspector span{overflow:hidden;text-overflow:ellipsis;max-width:170px}
.nks-note{position:absolute;z-index:2;display:flex;gap:6px;align-items:center;padding:4px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-elevation-soft)}
.nks-note input{width:220px;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 8px}
.nks-pins{flex:none;padding:2px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:4px}
.nks-busy{position:absolute;left:0;right:0;top:0;height:2px;overflow:hidden;z-index:3}
.nks-busy::before{content:"";display:block;width:35%;height:100%;background:var(--dsw-alias-brand-primary,var(--dsw-alias-link));animation:nks-beat 1s ease-in-out infinite}
@keyframes nks-beat{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
.nks-settings-body{display:flex;flex-direction:column;gap:8px}
.nks-settings-body label{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11)}
.nks-choices{display:flex;gap:4px}
.nks-choice{height:28px;padding:0 10px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);background:transparent;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);cursor:pointer}
.nks-choice[aria-checked="true"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
`

function post(path, body) {
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.error || payload.reason || `request failed (${response.status})`)
      error.errorId = payload.errorId || payload.reason || 'kitesurf.unknown'
      throw error
    }
    return payload
  })
}

/** Content-rect of the letterboxed image inside its frame; null before load. */
function frameOf(image) {
  if (!image || !image.naturalWidth) return null
  return contentFrame(
    { width: image.clientWidth, height: image.clientHeight },
    { width: image.naturalWidth, height: image.naturalHeight },
  )
}

/**
 * Page-space box for a pick, or null when the hit has no geometry
 * (html/body page-root, malformed box). Arrow picks derive one from the line.
 */
function elementBox(element) {
  if (!element) return null
  const box = element.box
  if (box && typeof box.width === 'number' && (box.width > 0 || box.height > 0)) return box
  if (element.tag === 'arrow' && element.from && element.to) {
    const x = Math.min(element.from.x, element.to.x)
    const y = Math.min(element.from.y, element.to.y)
    const width = Math.max(Math.abs(element.to.x - element.from.x), 4)
    const height = Math.max(Math.abs(element.to.y - element.from.y), 4)
    return { x, y, width, height }
  }
  return null
}

function insertComposerNote(text) {
  const root = document.querySelector('[data-composer-input]')
  const editor = root?.__lexicalEditor
  if (!editor || typeof editor.getEditorState !== 'function' || typeof editor.parseEditorState !== 'function') {
    throw new Error('composer input is not editable')
  }
  const current = editor.getEditorState().toJSON()
  current.root.children = [...(current.root.children || []), {
    children: [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
  }]
  editor.setEditorState(editor.parseEditorState(JSON.stringify(current)))
}

/**
 * Accessible single-choice group for the settings dialog: role=radiogroup of
 * role=radio buttons with roving tabindex and arrow-key movement.
 */
function selectRadio(group, value) {
  if (!group) return
  group.dataset.value = value
  const buttons = [...group.querySelectorAll('button')]
  for (const button of buttons) {
    const on = button.dataset.choice === value
    button.setAttribute('aria-checked', on ? 'true' : 'false')
    button.tabIndex = on ? 0 : -1
  }
}

function BrowserPane({ copy, languageOf, schemeOf }) {
  const [status, setStatus] = React.useState(null)
  const [pageUrl, setPageUrl] = React.useState('')
  const [draftUrl, setDraftUrl] = React.useState('')
  const [history, setHistory] = React.useState([])
  const [shot, setShot] = React.useState(null)
  // Identity of the page the shot came from — a pick whose url/scroll differs
  // means the frame is stale (page navigated or scrolled underneath it).
  const [shotMeta, setShotMeta] = React.useState(null)
  const [annotate, setAnnotate] = React.useState(false)
  /** { elements: element[] , anchor: {x,y} } — one element per selected box. */
  const [pick, setPick] = React.useState(null)
  const [pins, setPins] = React.useState([])
  const [draftBox, setDraftBox] = React.useState(null)
  /** 'box' | 'ellipse' | null — the drag kind in flight. */
  const [draftKind, setDraftKind] = React.useState(null)
  const [comment, setComment] = React.useState('')
  /** Double-click mode: the note form writes text back into the element. */
  const [editing, setEditing] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  /** Preview box under the cursor before a click (throttled pick preview). */
  const [hover, setHover] = React.useState(null)
  /** Content-rect of the letterboxed image — state, never read during render. */
  const [frame, setFrame] = React.useState(null)
  const toastTimer = React.useRef(0)
  const frameRef = React.useRef(null)
  const dragRef = React.useRef(null)
  const busyRef = React.useRef(false)
  const dialogOpenRef = React.useRef(false)
  const hoverTimerRef = React.useRef(0)
  // A click waits ~240ms before its pick: a double-click's second click would
  // otherwise re-pick mid-edit. lastDblClickRef stamps the dblclick
  // synchronously — the deferred callback checks it because editing lands
  // async (the pick request is in flight).
  const clickTimerRef = React.useRef(0)
  const lastDblClickRef = React.useRef(0)
  // Mutable mirrors for the window-level key handler: state captured in a
  // one-shot effect would freeze annotate/pins/pick at mount values.
  const annotateRef = React.useRef(false)
  const pickRef = React.useRef(null)
  const pinsRef = React.useRef([])
  const commentRef = React.useRef('')
  const editingRef = React.useRef(false)
  const shotMetaRef = React.useRef(null)
  annotateRef.current = annotate
  pickRef.current = pick
  pinsRef.current = pins
  commentRef.current = comment
  editingRef.current = editing
  shotMetaRef.current = shotMeta

  const refreshStatus = React.useCallback(() => {
    return fetch(STATUS)
      .then((response) => response.json())
      .then((payload) => { setStatus(payload); return payload })
      .catch((cause) => {
        const fallback = { ok: false, error: cause.message }
        setStatus(fallback)
        return fallback
      })
  }, [])

  React.useEffect(() => {
    // Mount only probes and mirrors: never Page.navigate without the user
    // asking (AGENTS.md). If an engine page exists, screenshot it; the engine
    // decides what is on screen.
    refreshStatus().then(async (statusPayload) => {
      if (!statusPayload?.ok) return
      try {
        const shotPayload = await post(SHOT, {})
        setShot(shotPayload.data)
        setShotMeta({ url: shotPayload.url || '', scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || '', at: Date.now() })
      } catch { /* engine up but page not shootable yet — fine */ }
    })
  }, [])

  // Letterbox geometry reacts to layout, not to render timing: observe the
  // frame and the image's own load so the box is right on first pick, after
  // resizes, and after a screenshot swap.
  // Design-mode keys live on the window while the pane exists — the pane
  // never holds focus reliably inside a host tab. Guarded by refs, so the
  // effect binds once. Cmd/Ctrl+Shift+D toggles annotate (Cursor parity).
  React.useEffect(() => {
    const onKey = (event) => {
      if (dialogOpenRef.current) return
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.shiftKey && event.code === 'KeyD') {
        event.preventDefault()
        setAnnotate((value) => !value)
        return
      }
      if (meta && !event.shiftKey && event.code === 'KeyZ') {
        if (!annotateRef.current || pinsRef.current.length === 0) return
        event.preventDefault()
        setPins((current) => current.slice(0, -1))
        return
      }
      if (meta && event.code === 'KeyL') {
        const open = pickRef.current
        if (!open?.elements?.length) return
        event.preventDefault()
        sendPick(true)
        return
      }
      // Arrow Up/Down walks parent/child while a note is open — Cursor parity.
      if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && annotateRef.current && pickRef.current) {
        const elements = pickRef.current.elements || []
        const last = elements[elements.length - 1]
        const selector = event.key === 'ArrowUp' ? last?.parentSel : last?.childSel
        if (selector) {
          event.preventDefault()
          post(PICK, { selector, preview: true })
            .then((payload) => {
              const element = payload.pick?.elements?.[0] ?? payload.pick?.element
              if (element) {
                setPick((current) => ({ elements: [...(current?.elements ?? []).slice(0, -1), element], anchor: current?.anchor ?? null }))
              }
            })
            .catch(() => { /* boundary reached — keep current selection */ })
        }
        return
      }
      if (event.key === 'Escape') {
        if (dragRef.current) { endDrag(); return }
        if (pickRef.current) { setPick(null); setEditing(false); return }
        if (annotateRef.current) setAnnotate(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  React.useLayoutEffect(() => {
    const element = frameRef.current
    if (!element) return undefined
    const measure = () => setFrame(frameOf(element.querySelector('img')))
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const image = element.querySelector('img')
    image?.addEventListener('load', measure)
    measure()
    return () => { observer.disconnect(); image?.removeEventListener('load', measure) }
  }, [shot])

  function showError(cause) {
    const errorId = cause?.errorId || 'kitesurf.unknown'
    const message = cause instanceof Error ? cause.message : String(cause)
    setToast(`${errorId} ${message}`)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
    refreshStatus() // a failure may have changed the engine's truth
  }

  function showToast(text) {
    setToast(text)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2000)
  }

  async function run(work) {
    busyRef.current = true
    setBusy(true)
    try {
      await work()
    } catch (cause) {
      showError(cause)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function remember(url) {
    setPageUrl(url)
    setHistory((current) => [url, ...current.filter((item) => item !== url)].slice(0, 8))
  }

  async function navigate(url) {
    await perf.span('navigate', async () => {
      await post(OPEN, { url })
    })
    const shotPayload = await post(SHOT, {})
    setShot(shotPayload.data)
    setShotMeta({ url: shotPayload.url || '', scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || '', at: Date.now() })
    setPick(null)
    remember(url)
  }

  async function reloadShot(scroll) {
    const shotPayload = await post(SHOT, scroll ? { scroll } : {})
    setShot(shotPayload.data)
    setShotMeta({ url: shotPayload.url || '', scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || '', at: Date.now() })
    setPick(null)
  }

  async function onSubmitAddress(event) {
    event.preventDefault()
    if (!draftUrl.trim()) return
    await run(() => navigate(draftUrl))
  }

  function framePoint(event) {
    const image = frameRef.current?.querySelector('img')
    if (!image) return null
    const rect = image.getBoundingClientRect()
    return shotPoint(
      { x: 0, y: 0, width: rect.width, height: rect.height },
      { width: image.naturalWidth, height: image.naturalHeight },
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
    )
  }

  function onPointerDown(event) {
    if (!annotate || event.button !== 0) return
    const point = framePoint(event)
    if (!point) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    // Shift = arrow (line between two points), Alt/Option = ellipse.
    dragRef.current = { ...point, moved: false, kind: event.shiftKey ? 'arrow' : event.altKey ? 'ellipse' : 'box' }
    setDraftKind(dragRef.current.kind)
    setDraftBox({ x: point.x, y: point.y, width: 0, height: 0 })
  }

  function onPointerMove(event) {
    const start = dragRef.current
    if (start) {
      const point = framePoint(event)
      if (!point) return
      const width = Math.abs(point.x - start.x)
      const height = Math.abs(point.y - start.y)
      if (width > 4 || height > 4) start.moved = true
      setDraftBox({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width, height })
      return
    }
    // Hover preview: dashed element box under the cursor before the click.
    // Throttled to one in-flight pick; previews never touch lastPick.
    if (!annotate || !shot || busyRef.current || pickRef.current) return
    if (hoverTimerRef.current) return
    hoverTimerRef.current = window.setTimeout(() => { hoverTimerRef.current = 0 }, 90)
    const point = framePoint(event)
    if (!point) { setHover(null); return }
    post(PICK, { x: point.x, y: point.y, preview: true })
      .then((payload) => setHover(elementBox(payload.pick?.elements?.[0] ?? payload.pick?.element)))
      .catch(() => setHover(null))
  }

  function endDrag() {
    dragRef.current = null
    setDraftBox(null)
    setDraftKind(null)
  }

  async function onPointerUp(event) {
    const start = dragRef.current
    if (!start) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    dragRef.current = null
    const point = framePoint(event)
    if (!point) { // released outside the letterboxed image — cancel, never pick
      setDraftBox(null)
      setDraftKind(null)
      return
    }
    const width = Math.abs(point.x - start.x)
    const height = Math.abs(point.y - start.y)
    if (!start.moved || (width < 8 && height < 8)) {
      setDraftBox(null)
      setDraftKind(null)
      // Click: element pick, deferred so a double-click can cancel it —
      // the second click's pointerup fires before dblclick.
      const toComposer = event.altKey && !pickRef.current
      const wasShift = event.shiftKey
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = 0
        // A dblclick (sync-stamped) or an open edit means this click was its
        // second half — drop it.
        if (editingRef.current || Date.now() - lastDblClickRef.current < 600) return
        run(async () => {
          const payload = await post(PICK, { x: start.x, y: start.y })
          const element = payload.pick?.elements?.[0] ?? payload.pick?.element
          if (!element) return
          // Stale-frame guard: the live page moved since this shot (navigated
          // or scrolled) — a pick drawn over the old pixels would silently
          // land on the wrong element. Refresh instead of trusting it.
          const meta = shotMetaRef.current
          const pickPage = payload.pick || {}
          const drifted = meta && pickPage.url && pickPage.url !== meta.url
          const scrolled = meta && !drifted && Math.abs((pickPage.scrollY || 0) - (meta.scrollY || 0)) > 8
          const retargeted = meta && pickPage.targetId && meta.targetId && pickPage.targetId !== meta.targetId
          if (drifted || scrolled || retargeted) {
            await reloadShot()
            showToast(copy.stalePage)
            return
          }
          if (wasShift && pickRef.current) {
            setPick((current) => ({ ...current, elements: [...current.elements, element] }))
            return
          }
          // Alt+click skips the note entirely — straight into the composer
          // with the packet (setPick is async; waiting on pickRef would die).
          if (toComposer) {
            sendPick(true, element)
            return
          }
          setPick({ elements: [element], anchor: { x: point.x, y: point.y } })
        })
      }, 240)
      return
    }
    setDraftBox(null)
    setDraftKind(null)
    if (start.kind === 'arrow') {
      setPick({
        elements: [{
          tag: 'arrow',
          text: '',
          from: { x: Math.round(start.x), y: Math.round(start.y) },
          to: { x: Math.round(point.x), y: Math.round(point.y) },
          style: {},
          componentStack: null,
        }],
        anchor: { x: point.x, y: point.y },
      })
      return
    }
    setPick({
      elements: [{
        tag: start.kind === 'ellipse' ? 'ellipse' : 'area',
        selector: 'area',
        text: '',
        box: {
          x: Math.round(Math.min(start.x, point.x)),
          y: Math.round(Math.min(start.y, point.y)),
          width: Math.round(width),
          height: Math.round(height),
        },
        style: {},
        componentStack: null,
      }],
      anchor: { x: point.x, y: point.y },
    })
  }

  function onPointerCancel() {
    endDrag()
  }

  function onWheel(event) {
    // React attaches passive wheel listeners, so preventDefault is a no-op;
    // the frame has overflow:hidden anyway. busyRef (not state) throttles.
    // A drag in progress keeps its coordinates only for THIS shot — scrolling
    // mid-drag would remap the box onto a different page (S3-4).
    if (!shot || busyRef.current || dragRef.current) return
    const delta = event.deltaY
    if (Math.abs(delta) < 8) return
    run(() => reloadShot(delta))
  }

  function onDoubleClick(event) {
    if (!annotate) return
    event.preventDefault()
    // Kill the deferred click-pick the second pointerup scheduled — and stamp
    // it so any earlier timer that survives the clearing also skips.
    lastDblClickRef.current = Date.now()
    clearTimeout(clickTimerRef.current)
    clickTimerRef.current = 0
    const open = pickRef.current
    const element = open?.elements?.[open.elements.length - 1]
    if (element?.selector) {
      setEditing(true)
      setComment(element.text || '')
      return
    }
    // No note open: pick this point now, then enter edit mode with its text.
    const point = framePoint(event)
    if (!point) return
    run(async () => {
      const payload = await post(PICK, { x: point.x, y: point.y })
      const picked = payload.pick?.elements?.[0] ?? payload.pick?.element
      if (!picked?.selector) return
      setPick({ elements: [picked], anchor: { x: point.x, y: point.y } })
      setEditing(true)
      setComment(picked.text || '')
    })
  }

  /** Turn the open pick into a note: pinned (default) or straight into the composer. */
  /** `element` overrides pickRef for Alt+click — the pick hasn't committed to
      * state yet when the click handler already wants it in the composer. */
  function sendPick(toComposer, element) {
    const open = element ? { elements: [element], anchor: null } : pickRef.current
    if (!open?.elements?.length) return
    try {
      const note = open.elements.length > 1
        ? multiNote(open.elements, { url: pageUrl, comment: commentRef.current })
        : designNote(open.elements[0], { url: pageUrl, comment: commentRef.current })
      if (toComposer) {
        insertComposerNote(note)
      } else {
        setPins((current) => [...current, { text: note, anchor: open.anchor ?? null, shot: shot }].slice(-MAX_PINS))
      }
      setComment('')
      setPick(null)
    } catch (cause) {
      showError(cause)
    }
  }

  function onSend(event) {
    event?.preventDefault()
    const open = pickRef.current
    if (editing && open?.elements?.length) {
      // Double-click mode: the input's text goes into the element itself.
      const element = open.elements[open.elements.length - 1]
      const text = commentRef.current
      setEditing(false)
      run(async () => {
        await post(EDIT, { selector: element.selector, text })
        await reloadShot()
        setPick(null)
      })
      return
    }
    sendPick(false)
  }

  function onSendAll() {
    if (pins.length === 0) return
    try {
      insertComposerNote(batchNote(pins.map((pin) => pin.text)))
      setPins([])
    } catch (cause) {
      showError(cause)
    }
  }

  function onStartEngine() {
    // The status call decides start vs resume; the pane should not guess phase.
    run(async () => {
      const fresh = await refreshStatus()
      const phase = fresh?.kite?.phase
      if (phase === 'running') return
      const action = phase === 'suspended' ? 'resume' : 'start'
      await post(KITE, { action })
      await reloadShot()
    })
  }

  async function onRefresh() {
    if (!pageUrl) return
    await run(() => navigate(pageUrl))
  }

  function openHistory(event) {
    if (!history.length) return
    const rect = event.currentTarget.getBoundingClientRect()
    openNanoMenu({
      anchor: { left: rect.left, bottom: rect.bottom },
      items: history.map((url) => ({
        id: url,
        label: url,
        run: () => { setDraftUrl(url); run(() => navigate(url)) },
      })),
      theme: schemeOf?.(),
      maxHeight: 8 * 28 + 8,
    })
  }

  // Overlay geometry: one box per picked element (multi-select shows each),
  // the drag draft, and the dashed hover preview. Page-root picks (html/body,
  // zero-size) get no box — their note anchors at the click point instead.
  const pickBoxes = pick?.elements
    ? pick.elements.map((element) => elementBox(element)).filter(Boolean)
    : []
  const allBoxes = draftBox
    ? [{ box: draftBox, kind: draftKind === 'ellipse' ? 'ellipse' : 'draft' }]
    : [
        ...pickBoxes.map((box, index) => ({ box, kind: pick?.elements?.[index]?.tag === 'ellipse' ? 'ellipse' : 'pick' })),
        ...(hover && !pick ? [{ box: hover, kind: 'hover' }] : []),
      ]
  const overlays = frame ? allBoxes.map(({ box, kind }) => ({
    kind,
    left: frame.left + box.x * frame.scale,
    top: frame.top + box.y * frame.scale,
    width: Math.max(box.width * frame.scale, 2),
    height: Math.max(box.height * frame.scale, 2),
  })) : []
  const anchor = pick?.anchor
  const pickAnchor = (overlays.find((o) => o.kind === 'pick' || o.kind === 'ellipse'))
    || (frame && anchor ? { left: frame.left + anchor.x * frame.scale, top: frame.top + anchor.y * frame.scale, width: 0, height: 0 } : null)
    || (frame ? { left: frame.left + 16, top: frame.top + 16, width: 0, height: 0 } : null)

  const glyph = (name) => {
    const Icon = {
      up: primitives.IconChevronUpOutlineRegular,
      down: primitives.IconChevronDownOutlineRegular,
      history: primitives.IconClockOutlineRegular,
      refresh: primitives.IconRefreshOutlineRegular,
      go: primitives.IconLinkOutlineRegular,
      annotate: primitives.IconEditOutlineRegular,
      settings: primitives.IconSettingsOutlineRegular,
      send: primitives.IconRightUpOutlineRegular,
      undo: primitives.IconCloseOutlineRegular,
      exit: primitives.IconCloseOutlineRegular,
      clear: primitives.IconDeleteOutlineRegular || primitives.IconCloseOutlineRegular,
      edit: primitives.IconEditOutlineRegular || primitives.IconRightUpOutlineRegular,
    }[name]
    return h(Icon, { width: 16, height: 16, 'aria-hidden': true })
  }

  function openSettings() {
    if (dialogOpenRef.current) return
    dialogOpenRef.current = true
    const region = document.querySelector('[data-nks-workspace]')?.getBoundingClientRect()
    let close = () => {}
    let current = { userAgent: '', viewportWidth: '', httpBase: '', mcpPort: '' }
    const dialog = openNanoDialog({
      copy: { cancel: copy.cancel, confirm: copy.save, close: copy.close },
      title: copy.settingsTitle,
      description: copy.settingsDesc,
      width: 420,
      region,
      // openNanoDialog already closes itself after onCancel — closing here
      // again would double root.unmount()/host.remove() (S3-3).
      onCancel: () => { dialogOpenRef.current = false },
      onConfirm: () => save(),
      children: h('form', {
        className: 'nks-settings-body',
        onSubmit: (event) => { event.preventDefault(); save() },
      },
        h('label', { htmlFor: 'nks-ua' }, copy.uaLabel),
        h('input', { id: 'nks-ua', className: 'nks-address', autoFocus: true, placeholder: copy.uaPlaceholder }),
        h('label', { htmlFor: 'nks-origin' }, copy.originLabel),
        h('input', { id: 'nks-origin', className: 'nks-address', placeholder: 'http://127.0.0.1:8787', inputMode: 'url', spellCheck: false, autoComplete: 'off' }),
        h('label', { htmlFor: 'nks-mcp' }, copy.mcpLabel),
        h('input', { id: 'nks-mcp', className: 'nks-address', inputMode: 'numeric', placeholder: '8799' }),
        h('span', { id: 'nks-viewport-label' }, copy.viewportLabel),
        h('div', {
          id: 'nks-viewport',
          className: 'nks-choices',
          role: 'radiogroup',
          'aria-labelledby': 'nks-viewport-label',
          'data-value': 'default',
          onKeyDown: (event) => {
            const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
            if (!keys.includes(event.key)) return
            event.preventDefault()
            const values = [...event.currentTarget.querySelectorAll('button')].map((b) => b.dataset.choice)
            const index = Math.max(0, values.indexOf(event.currentTarget.dataset.value))
            const next = event.key === 'Home' ? values[0]
              : event.key === 'End' ? values[values.length - 1]
              : values[(index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + values.length) % values.length]
            selectRadio(event.currentTarget, next)
            event.currentTarget.querySelector(`[data-choice="${next}"]`)?.focus()
          },
        }, [
          ['default', copy.viewportDefault],
          ['1280', copy.viewportDesktop],
          ['768', copy.viewportTablet],
          ['390', copy.viewportPhone],
        ].map(([value, label]) => h('button', {
          key: value,
          type: 'button',
          role: 'radio',
          'aria-checked': value === 'default' ? 'true' : 'false',
          tabIndex: value === 'default' ? 0 : -1,
          'data-choice': value,
          className: 'nks-choice',
          onClick: (event) => selectRadio(event.currentTarget.parentElement, value),
        }, label))),
        h('button', { type: 'submit', style: { display: 'none' }, 'aria-hidden': 'true', tabIndex: -1 })),
    })
    close = () => { dialogOpenRef.current = false; dialog.close() }

    function save() {
      const nextAgent = document.getElementById('nks-ua')?.value ?? ''
      const choice = document.getElementById('nks-viewport')?.dataset.value ?? 'default'
      const nextOrigin = (document.getElementById('nks-origin')?.value ?? '').trim()
      const nextPort = (document.getElementById('nks-mcp')?.value ?? '').trim()
      run(async () => {
        const settingsPatch = {}
        if (nextAgent !== current.userAgent) settingsPatch.userAgent = nextAgent
        const nextWidth = choice === 'default' ? '' : choice
        if (nextWidth !== current.viewportWidth) {
          settingsPatch.viewport = choice === 'default' ? null : { width: Number(choice) }
        }
        if (Object.keys(settingsPatch).length) await post(SETTINGS, settingsPatch)
        const kitePatch = {}
        if (nextOrigin && nextOrigin !== current.httpBase) kitePatch.httpBase = nextOrigin
        if (nextPort && nextPort !== String(current.mcpPort)) kitePatch.mcpPort = nextPort
        if (Object.keys(kitePatch).length) await post(KITE, { action: 'configure', ...kitePatch })
        close()
        showToast(copy.saved)
        refreshStatus()
      })
    }

    // Seed the dialog from live status so saving never resets unseen fields.
    refreshStatus().then((fresh) => {
      current = {
        userAgent: fresh?.userAgent ?? '',
        viewportWidth: fresh?.viewport?.width ? String(fresh.viewport.width) : '',
        httpBase: fresh?.kite?.httpBase ?? '',
        mcpPort: fresh?.kite?.mcpPort != null ? String(fresh.kite.mcpPort) : '',
      }
      const ua = document.getElementById('nks-ua')
      if (ua) ua.value = current.userAgent
      const originInput = document.getElementById('nks-origin')
      if (originInput) originInput.value = current.httpBase
      const mcp = document.getElementById('nks-mcp')
      if (mcp) mcp.value = current.mcpPort
      selectRadio(document.getElementById('nks-viewport'), current.viewportWidth || 'default')
    })
  }

  return h('section', {
    className: 'nks-root',
    'data-nano-kitesurf': '1',
    'data-nks-workspace': '1',
  },
    h('form', { className: 'nks-toolbar', onSubmit: onSubmitAddress },
      h('button', { type: 'button', className: 'nks-tool', 'aria-label': copy.up, disabled: busy || !shot, onClick: () => run(() => reloadShot(-480)) }, glyph('up')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-lower': '1', 'aria-label': copy.down, disabled: busy || !shot, onClick: () => run(() => reloadShot(480)) }, glyph('down')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-reload': '1', 'aria-label': copy.refresh, disabled: busy || !pageUrl, onClick: onRefresh }, glyph('refresh')),
      h('span', { className: 'nks-address-box', 'data-dirty': draftUrl ? 'true' : 'false' },
        h('input', {
          className: 'nks-address',
          'aria-label': copy.addressAria,
          placeholder: copy.addressPlaceholder,
          inputMode: 'url',
          spellCheck: false,
          autoComplete: 'off',
          value: draftUrl,
          onChange: (event) => setDraftUrl(event.target.value),
        }),
        h('button', { type: 'submit', className: 'nks-tool nks-go', 'aria-label': copy.go, disabled: busy }, glyph('go'))),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-history': '1', 'aria-label': copy.history, title: copy.history, disabled: busy || !history.length, onClick: openHistory }, glyph('history')),
      h('button', {
        type: 'button',
        className: 'nks-tool',
        'data-nks-annotate': '1',
        'aria-pressed': annotate ? 'true' : 'false',
        'aria-label': copy.annotate,
        title: copy.annotateTitle,
        onClick: () => setAnnotate((value) => !value),
      }, glyph('annotate')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-settings': '1', 'aria-label': copy.settings, onClick: openSettings }, glyph('settings'))),
    pins.length ? h('div', { className: 'nks-pins', 'data-nks-pins': String(pins.length), 'aria-live': 'polite' },
      `${pins.length} ${copy.pinsCount}${pins.length === MAX_PINS ? copy.pinsFull : ''}`,
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-undo-pin': '1', 'aria-label': copy.undoPin, onClick: () => setPins((current) => current.slice(0, -1)) }, glyph('undo')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-clear-pins': '1', 'aria-label': copy.clearPins, onClick: () => setPins([]) }, glyph('clear')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-send-all': '1', 'aria-label': copy.sendAll, onClick: onSendAll }, glyph('send'))) : null,
    annotate && shot ? h('div', { className: 'nks-hint', 'data-nks-hint': '1' },
      h('span', { className: 'nks-hint-text' }, copy.hintBar),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-exit-annotate': '1', 'aria-label': copy.annotate, onClick: () => setAnnotate(false) }, glyph('exit'))) : null,
    h('div', {
      ref: frameRef,
      className: 'nks-frame',
      'data-nks-frame': '1',
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onDoubleClick,
      onWheel,
      style: { cursor: annotate ? 'crosshair' : 'default' },
    },
      busy ? h('div', { className: 'nks-busy', 'data-nks-loading': '1', role: 'progressbar', 'aria-label': copy.opening }) : null,
      shot ? h('img', {
        alt: '',
        draggable: false,
        src: `data:image/png;base64,${shot}`,
        style: { pointerEvents: annotate ? 'none' : 'auto' },
      }) : h('p', { className: 'nks-empty' },
        busy ? copy.opening
          : status?.engineMismatch === true ? copy.engineMismatch
          : status?.ok === false ? copy.engineDown
          : copy.emptyHint),
      // Engine is idle/suspended with nothing on screen: offer start instead
      // of a dead hint. First-run path now self-serves.
      !shot && !busy && status?.ok === false && status?.kite?.phase !== 'running' ? h('div', { className: 'nks-start' },
        h('button', {
          type: 'button',
          className: 'nks-start-btn',
          'data-nks-start-engine': '1',
          onClick: onStartEngine,
        }, copy.startEngine)) : null,
      overlays.map((box, index) => h('div', {
        key: index,
        className: 'nks-box',
        'data-nks-box': box.kind,
        'data-kind': box.kind === 'ellipse' ? 'ellipse' : box.kind === 'hover' ? 'hover' : undefined,
        style: { left: box.left, top: box.top, width: box.width, height: box.height },
      })),
      // Numbered pin dots stay over their shot until the shot changes; a
      // refreshed page clears them with the old pixels.
      frame ? pins.filter((pin) => pin.anchor && pin.shot === shot).map((pin, index) => h('div', {
        key: `pin-${index}`,
        className: 'nks-pin-dot',
        'data-nks-pin-dot': String(index + 1),
        title: pin.text?.slice(0, 60) || '',
        onPointerDown: (event) => event.stopPropagation(),
        // Click a dot to drop that queued note — index is inside the filtered
        // subset so remove by identity, not position.
        onClick: (event) => { event.stopPropagation(); setPins((current) => current.filter((item) => item !== pin)) },
        style: { left: frame.left + pin.anchor.x * frame.scale, top: frame.top + pin.anchor.y * frame.scale },
      }, String(index + 1))) : null,
      pickAnchor && pick ? h('form', {
        className: 'nks-note',
        'data-nks-note': '1',
        onSubmit: onSend,
        onClick: (event) => event.stopPropagation(),
        onPointerDown: (event) => event.stopPropagation(),
        onPointerMove: (event) => event.stopPropagation(),
        onPointerUp: (event) => event.stopPropagation(),
        style: {
          left: Math.max(8, Math.min(pickAnchor.left, Math.max(8, (frameRef.current?.clientWidth || 320) - 248))),
          top: pickAnchor.top + pickAnchor.height + 8 > (frameRef.current?.clientHeight || 0) - 44
            ? Math.max(8, pickAnchor.top - 44)
            : pickAnchor.top + pickAnchor.height + 8,
        },
      },
        pick.elements.length > 1 ? h('span', { 'data-nks-multi': String(pick.elements.length) }, `×${pick.elements.length}`) : null,
        h('input', {
          'aria-label': editing ? copy.editAria : copy.noteAria,
          'data-nks-comment': '1',
          value: comment,
          placeholder: editing ? copy.editPlaceholder : copy.notePlaceholder,
          autoFocus: true,
          onChange: (event) => setComment(event.target.value),
        }),
        h('button', { type: 'submit', className: 'nks-tool', 'data-nks-send': '1', 'aria-label': editing ? copy.editSend : copy.noteSend }, glyph(editing ? 'edit' : 'send'))) : null),
    // Inspector strip: the picked element's live computed styles under the
    // frame — Cursor's design-mode sidebar reduced to one readable row.
    pick?.elements?.[0] && pick.elements[0].style && Object.keys(pick.elements[0].style).length ? h('div', { className: 'nks-inspector', 'data-nks-inspector': '1' },
      h('span', null, h('b', null, pick.elements[0].selector || pick.elements[0].tag)),
      pick.elements[0].style.color ? h('span', null, `color ${pick.elements[0].style.color}`) : null,
      pick.elements[0].style.fontSize ? h('span', null, `font ${pick.elements[0].style.fontSize}`) : null,
      pick.elements[0].style.fontFamily ? h('span', null, pick.elements[0].style.fontFamily.split(',')[0].replace(/["']/g, '')) : null,
      pick.elements[0].style.display ? h('span', null, pick.elements[0].style.display) : null,
      pick.elements[0].box ? h('span', null, `${Math.round(pick.elements[0].box.width)}×${Math.round(pick.elements[0].box.height)}`) : null) : null,
    toast ? h(NanoToast, { text: toast }) : null,
    pick?.elements?.length ? h('pre', {
      'data-nks-pick': '1',
      style: { display: 'none' },
    }, pick.elements.length > 1
      ? multiNote(pick.elements, { url: pageUrl, comment })
      : designNote(pick.elements[0], { url: pageUrl, comment })) : null)
}

export const inject = ['slots', 'sidebarRightTabs', 'locale', 'theme']

export function apply(ctx) {
  const style = document.createElement('style')
  style.dataset.nksStyle = 'true'
  style.textContent = NANO_STYLES + STYLE
  document.head.append(style)
  ctx.effect(() => () => style.remove())

  const languageOf = () => ctx.locale?.getSnapshot?.().active ?? 'zh'
  const schemeOf = () => ctx.theme?.getTheme?.().colorScheme === 'light' ? 'light' : 'dark'
  const copy = () => copyFor(languageOf())
  const Pane = () => h(BrowserPane, { copy: copy(), languageOf, schemeOf })

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: OWN_ID,
    kind: KIND,
    priority: 'extension',
    keepMounted: true,
    multiple: false,
    title: () => copy().typeLabel,
    guide: [{
      id: 'kitesurf',
      order: 40,
      title: () => copy().typeLabel,
      description: () => copy().typeDescription,
    }],
  }))

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: OWN_ID,
  }, Pane)))

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab.title',
    key: OWN_ID,
  }, function KitesurfTitle() {
    return copy().typeLabel
  })))
}
