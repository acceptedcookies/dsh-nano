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
const HISTORY = '/nano-kitesurf/history'
const PORTS = '/nano-kitesurf/ports'
const RECOVER = '/nano-kitesurf/recover'
const DIAGNOSTICS = '/nano-kitesurf/diagnostics'
const CONSOLE = '/nano-kitesurf/console'
const NETWORK = '/nano-kitesurf/network'
const ELEMENTS = '/nano-kitesurf/elements'
const BROWSE_HISTORY = '/nano-kitesurf/browse-history'
const DOM = '/nano-kitesurf/dom'
const CONTEXT = '/nano-kitesurf/context'
const KITE = '/nano-kitesurf/kite'
const KIND = 'kitesurf'
const OWN_ID = 'nano-kitesurf'
const CAPTURE_HEIGHT = 800
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
.nks-root{position:relative;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;flex:auto;display:flex;font:var(--dsw-font-xxs-12);container-type:inline-size}
.nks-toolbar{position:relative;z-index:3;margin-top:26px;box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:4px;height:38px;padding:5px 6px;display:flex}
.nks-tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;background:transparent;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}
.nks-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.nks-tool:disabled{color:var(--dsw-alias-label-tertiary,rgba(207,211,214,.55));opacity:.45;cursor:default}
.nks-tool:disabled:hover{background:transparent}
.nks-tool:focus-visible,.nks-address:focus-visible{outline:2px solid var(--dsw-alias-link);outline-offset:1px}
.nks-tool[aria-pressed="true"]{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-link) 18%,transparent)}
.nks-address-box{flex:auto;min-width:0;position:relative}
.nks-address{box-sizing:border-box;width:100%;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 32px 0 9px}
.nks-address::placeholder{color:var(--dsw-alias-label-tertiary)}
.nks-go{visibility:hidden;opacity:0;position:absolute;top:0;right:0}
.nks-address-box:focus-within .nks-go,.nks-address-box[data-dirty="true"] .nks-go{visibility:visible;opacity:1}
.nks-frame{position:relative;z-index:0;order:1;overflow:auto;flex:auto;min-height:0;overflow:hidden;contain:layout paint;background:var(--dsw-alias-bg-layer-1)}
.nks-frame iframe.nks-dom{width:100%;height:100%;border:0;display:block;background:#fff}
.nks-frame img{width:100%;height:100%;object-fit:contain;object-position:center;display:block}
.nks-empty{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.nks-empty-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-link,#2f6fed);border:.5px solid var(--dsw-alias-border-l2)}
.nks-empty-title{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13,var(--dsw-font-xxs-12));font-weight:600}
.nks-empty-body{max-width:340px;line-height:1.55}
.nks-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:2px}
.nks-empty-link{color:var(--dsw-alias-link,#2f6fed);cursor:pointer;background:none;border:0;font:inherit;padding:0;text-decoration:underline;text-underline-offset:2px}
.nks-empty-meta{font:var(--dsw-font-xxxs-11);opacity:.75;word-break:break-all;max-width:340px}
.nks-box{position:absolute;border:1.5px solid var(--dsw-alias-link,#2f6fed);box-shadow:0 0 0 1px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.55);pointer-events:none}
.nks-box[data-kind="ellipse"]{border-radius:50%}
.nks-box[data-kind="hover"]{border-style:dashed;opacity:.75}
.nks-pin-dot{position:absolute;width:18px;height:18px;margin-left:-9px;margin-top:-9px;color:#fff;font:var(--dsw-font-xxxs-11);line-height:18px;text-align:center;background:var(--dsw-alias-link,#2f6fed);box-shadow:0 0 0 1.5px rgba(0,0,0,.45),0 1px 4px rgba(0,0,0,.4);border-radius:50%;pointer-events:auto;cursor:pointer;user-select:none}
.nks-pin-dot:hover{background:var(--dsw-alias-fill-error,#d5455c);transform:scale(1.15)}
.nks-hint{position:relative;z-index:2;flex:none;padding:3px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:6px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-hint-text{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-start-btn{height:30px;padding:0 14px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);cursor:pointer}
.nks-start-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-inspector{flex:none;padding:3px 8px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;gap:10px;overflow:hidden;border-top:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.nks-inspector b{font-weight:500;color:var(--dsw-alias-label-secondary)}
.nks-inspector span{overflow:hidden;text-overflow:ellipsis;max-width:170px}
.nks-note{position:absolute;z-index:2;display:flex;gap:4px;align-items:center;padding:4px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-elevation-soft)}
.nks-note-actions{display:flex;gap:2px;align-items:center}
.nks-note-form{display:flex;gap:4px;align-items:center}
.nks-note input{width:220px;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 8px}
.nks-pins{flex:none;padding:2px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:4px}
.nks-busy{position:absolute;left:0;right:0;top:0;height:2px;overflow:hidden;z-index:3}
.nks-busy::before{content:"";display:block;width:35%;height:100%;background:var(--dsw-alias-link,#2f6fed);animation:nks-beat 1s ease-in-out infinite}
@keyframes nks-beat{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
.nks-settings-body{display:flex;flex-direction:column;gap:8px}
.nks-status{position:relative;z-index:3;order:7;flex:none;display:flex;align-items:center;gap:8px;height:26px;padding:0 8px;border-top:.5px solid var(--dsw-alias-border-l3);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-status button{height:20px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer}
.nks-status button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-status button[aria-pressed="true"],.nks-status button[data-nks-native-toggle][aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link,#7aaaff) 22%,transparent);color:var(--dsw-alias-label-primary)}
.nks-status .nks-count[data-bad="true"]{color:var(--dsw-alias-fill-error,#d5455c)}
.nks-dt{flex:none;height:240px;z-index:6;order:8;border-radius:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border-top:.5px solid var(--dsw-alias-border-l2);min-height:0;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.nks-dt-head{flex:none;display:flex;align-items:center;gap:2px;height:28px;padding:0 6px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.nks-dt-tab{height:28px;padding:0 10px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);font:11px/1 ui-monospace,Menlo,monospace;cursor:pointer}
.nks-dt-tab:hover{color:var(--dsw-alias-label-secondary)}
.nks-dt-tab[aria-selected="true"]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-link,#7aaaff)}
.nks-dt-body{flex:auto;min-height:0;overflow:auto;font:11px/1.45 ui-monospace,Menlo,monospace}
.nks-dt-cols{flex:none;display:flex;gap:8px;padding:2px 8px;color:var(--dsw-alias-label-quaternary,var(--dsw-alias-label-tertiary));border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);font-size:10px;text-transform:uppercase;letter-spacing:.04em}
.nks-dt-row{display:flex;gap:8px;padding:2px 8px;border-bottom:.5px solid color-mix(in srgb,var(--dsw-alias-border-l3) 45%,transparent);align-items:baseline;white-space:nowrap}
.nks-dt-row:nth-child(even){background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 45%,transparent)}
.nks-dt-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-dt-lv{flex:none;width:56px;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;font-size:10px}
.nks-dt-lv[data-lv="error"],.nks-dt-lv[data-lv="exception"]{color:var(--dsw-alias-fill-error,#d5455c)}
.nks-dt-lv[data-lv="warn"]{color:var(--dsw-alias-fill-warning,#d29922)}
.nks-dt-lv[data-lv="network"]{color:var(--dsw-alias-link,#7aaaff)}
.nks-dt-msg{flex:auto;min-width:0;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary)}
.nks-dt-grow{flex:1 1 auto;min-width:0;max-width:none}
.nks-dt-url{flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);direction:ltr}
.nks-dt-st{flex:none;width:34px;text-align:right}
.nks-dt-st[data-bad="true"]{color:var(--dsw-alias-fill-error,#d5455c)}
.nks-dt-dur{flex:none;width:56px;text-align:right;color:var(--dsw-alias-label-tertiary)}
.nks-dt-time{flex:none;width:64px;color:var(--dsw-alias-label-tertiary)}
.nks-dt-src{flex:none;max-width:32%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);text-align:right}
.nks-dt-type{flex:none;width:72px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-size{flex:none;width:56px;text-align:right;color:var(--dsw-alias-label-tertiary)}
.nks-dt-styles{flex:none;max-height:110px;overflow:auto;border-bottom:.5px solid var(--dsw-alias-border-l2);padding:4px 8px;background:var(--dsw-alias-bg-layer-1)}
.nks-dt-style-head{color:var(--dsw-alias-label-secondary);margin-bottom:3px}
.nks-dt-rule{display:flex;gap:8px;padding:1px 0;color:var(--dsw-alias-label-tertiary)}
.nks-dt-rule b{color:var(--dsw-alias-link,#7aaaff);font-weight:500;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-rule span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-modal-mask{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}
.nks-modal{width:min(560px,92%);max-height:78%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.45);overflow:hidden}
.nks-modal-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.nks-modal-head b{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.nks-modal-sub{color:var(--dsw-alias-label-tertiary);font-size:11px}
.nks-modal-x{margin-left:auto;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:16px;cursor:pointer}
.nks-modal-bar{display:flex;gap:8px;padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-modal-bar input{flex:auto;height:28px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}
.nks-modal-bar button{height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.nks-modal-body{overflow:auto;padding:4px 0}
.nks-modal-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.nks-hist-row{display:flex;align-items:center;gap:6px;padding:0 8px}
.nks-hist-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-hist-open{flex:auto;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:7px 4px;border:0;background:transparent;cursor:pointer;text-align:left}
.nks-hist-url{color:var(--dsw-alias-label-primary);font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-hist-meta{color:var(--dsw-alias-label-tertiary);font-size:10px}
.nks-hist-del{width:24px;height:24px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.nks-hist-del:hover{color:var(--dsw-alias-fill-error,#d5455c);background:color-mix(in srgb,var(--dsw-alias-fill-error,#d5455c) 14%,transparent)}
.nks-dt-empty{padding:14px;color:var(--dsw-alias-label-tertiary)}
.nks-env{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:6px}
.nks-env-title{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);text-transform:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
.nks-env-row{display:flex;justify-content:space-between;gap:10px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-env-row b{font-weight:500;color:var(--dsw-alias-label-secondary);flex:none}
.nks-env-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;unicode-bidi:plaintext}
.nks-env-ok{color:var(--dsw-alias-fill-success,#3fb950)}
.nks-env-bad{color:var(--dsw-alias-fill-error,#d5455c)}
.nks-env-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.nks-env-note{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);line-height:1.5}
.nks-settings-body label{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11)}
.nks-choices{display:flex;gap:4px}
.nks-choice{height:28px;padding:0 10px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);background:transparent;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);cursor:pointer}
.nks-choice[aria-checked="true"]{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-link,#2f6fed) 22%,transparent);box-shadow:inset 0 0 0 1px var(--dsw-alias-link,#2f6fed)}
.nks-choice[aria-checked="true"]::before{content:"✓ ";font-weight:600}
/* Narrow split pane: a 286px rail cannot hold 7 tools + an address bar.
   Keep navigation + address + annotate; fold history/settings into the
   overflow affordance is out of scope for CSS, so they shrink and the
   placeholder switches to a short form. */
@container (max-width: 400px){
  .nks-toolbar{gap:2px;padding:5px 4px}
  .nks-tool{width:26px;height:26px}
  .nks-address{padding:0 4px 0 7px;font-size:11px}
  .nks-address::placeholder{color:transparent}
  .nks-address-box::after{content:"网址";position:absolute;left:8px;top:6px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);pointer-events:none}
  .nks-address-box:focus-within::after,.nks-address-box[data-dirty="true"]::after{content:none}
  .nks-go{display:none}
  .nks-pins{gap:2px}
  .nks-hint-text{font-size:10px}
}
/* Frame: never letterbox into a black void — a subtle checker makes the
   dead area read as "canvas", and the picture is centred by object-position. */
.nks-frame{background-image:linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%),linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%);background-size:16px 16px;background-position:0 0,8px 8px}
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
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [shot, setShot] = React.useState(null)
  const [shotMime, setShotMime] = React.useState('image/webp')
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
  // Note bubble starts compact (arrow / copy / input); the text field only
  // exists after the human asks for it — typing is not the default path.
  const [composing, setComposing] = React.useState(false)
  const refSeq = React.useRef(0)
  const [devtoolsOpen, setDevtoolsOpen] = React.useState(false)
  // Native HTML is the default surface: the iframe gets real DOM/CSS and the
  // picker is bound after document.write (which wipes listeners).
  const [nativeHtml, setNativeHtml] = React.useState(true)
  const [domDoc, setDomDoc] = React.useState(null)
  const [vp, setVp] = React.useState(null)
  const [vpCustom, setVpCustom] = React.useState(false)
  const domFrameRef = React.useRef(null)
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
  const shotInFlightRef = React.useRef(false)
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
  // ⌘L's window-level handler binds once; without this ref it would call the
  // mount-time sendPick, which closes over an empty pageUrl — the note that
  // reached composer lost its `url:` line. Keep the latest function here.
  const sendPickRef = React.useRef(null)
  annotateRef.current = annotate
  pickRef.current = pick
  pinsRef.current = pins
  commentRef.current = comment
  editingRef.current = editing
  shotMetaRef.current = shotMeta

  // The address bar mirrors the live page unless the human is typing in it —
  // a page opened by an agent (or by history) used to leave the field blank,
  // so there was no way to read or copy the current URL.
  const addressFocusedRef = React.useRef(false)
  React.useEffect(() => {
    if (pageUrl && !addressFocusedRef.current) setDraftUrl(pageUrl)
  }, [pageUrl])

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
        const fit = frameSize()
        const shotPayload = await post(SHOT, { format: 'webp', ...(fit ? { fit } : {}) })
        setShot(shotPayload.data)
        setShotMime(shotPayload.mimeType || 'image/webp')
        loadDom().catch(() => {})
        setShotMeta({ url: shotPayload.url || '', scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || '', viewport: shotPayload.viewport?.width ?? null, at: Date.now() })
        // pageUrl mirrors whatever the engine reports — pages opened behind
        // the pane (agent /open) still name the right url in notes.
        if (shotPayload.url && shotPayload.url !== 'about:blank') setPageUrl(shotPayload.url)
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
        sendPickRef.current?.(true)
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

  // An agent can /open a page behind the pane. Re-shoot on focus so the
  // human is never staring at a stale frame with a disabled refresh button.
  // suspend/resume (or an external restart) drops the engine page back to
  // about:blank. Without this the pane kept a screenshot of a page that no
  // longer exists. Clear it so the empty state tells the truth.
  // Self-heal: if the pane mounted while the engine was still blank (common
  // after a host restart, or when an agent opens a page behind the pane),
  // keep trying until a frame exists instead of sitting on the empty state.
  // If the pane started while the engine was blank it falls back to the
  // screenshot; once a frame exists, upgrade to native HTML.
  React.useEffect(() => {
    if (nativeHtml && shot && !domDoc) loadDom().catch(() => {})
  }, [shot, nativeHtml])

  React.useEffect(() => {
    if (shot) return undefined
    const timer = window.setInterval(() => {
      if (!busyRef.current) reloadShot(0, { keepPick: true }).catch(() => {})
    }, 2000)
    return () => clearInterval(timer)
  }, [shot])

  React.useEffect(() => {
    let armed = 0
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') { armed = Date.now(); return }
      if (armed && Date.now() - armed < 1200 && event.key === '2') { event.preventDefault(); armed = 0; setDevtoolsOpen((value) => !value) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  React.useEffect(() => {
    if (!nativeHtml) return
    const frame = domFrameRef.current
    if (frame && domDoc) { try { writeDomFrame(frame) } catch { /* not ready */ } }
  }, [domDoc, nativeHtml])

  React.useEffect(() => {
    const onMessage = (event) => {
      const data = event.data
      if (!data || data.__nks !== 'pick' || !data.packet) return
      const packet = data.packet
      setPick({ elements: [packet], anchor: packet.box ? { x: packet.box.x + packet.box.width / 2, y: packet.box.y + packet.box.height } : null })
      setEditing(false)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  React.useEffect(() => {
    const phase = status?.kite?.phase
    if (phase && phase !== 'running' && shot) { setShot(null); setPick(null); setPins([]); setShotMeta(null) }
  }, [status?.kite?.phase])

  // Fit-to-pane: when the split pane is resized, the engine viewport must
  // follow it — otherwise a 16:9 shot inside a 4:5 pane reintroduces the
  // letterbox the fit mode exists to remove. Debounced to one re-shoot per
  // settled size.
  React.useEffect(() => {
    const element = frameRef.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    let timer = 0
    let last = ''
    const observer = new ResizeObserver(() => {
      const size = frameSize()
      if (!size) return
      const key = `${size.width}x${size.height}`
      if (key === last) return
      const previous = last
      last = key
      if (!previous) return // first measurement is the mount shot
      clearTimeout(timer)
      timer = window.setTimeout(() => { if (!busyRef.current) reloadShot(0, { keepPick: true, fromResize: true }).catch(() => {}) }, 320)
    })
    observer.observe(element)
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [])

  React.useEffect(() => {
    const onFocus = () => { if (!busyRef.current) reloadShot(0, { keepPick: true }).catch(() => {}) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  React.useLayoutEffect(() => {
    const element = frameRef.current
    if (!element) return undefined
    const measure = () => {
      // Native-HTML mode has no <img>; the iframe's own client box is the
      // 1:1 coordinate space, so overlays line up without letterbox maths.
      const img = element.querySelector('img')
      if (img) { setFrame(frameOf(img)); return }
      const rect = element.getBoundingClientRect()
      setFrame(rect.width > 0 && rect.height > 0
        ? { left: 0, top: 0, width: rect.width, height: rect.height, scale: 1 }
        : null)
    }
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
    // One entry guard for EVERY action (address Enter, refresh, start engine,
    // history, settings apply): a second submit while the first /open is in
    // flight used to fire a duplicate navigate and clear busy early.
    if (busyRef.current) return
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
    const fit = frameSize()
    const shotPayload = await post(SHOT, { format: 'webp', ...(fit ? { fit } : {}) })
    setShot(shotPayload.data)
    setShotMime(shotPayload.mimeType || 'image/webp')
    setShotMeta({ url: shotPayload.url || '', scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || '', viewport: shotPayload.viewport?.width ?? null, at: Date.now() })
    await loadDom()
    setPick(null)
    remember(url)
  }

  /** Pane content size in integer CSS px — the engine viewport we ask for. */
  function frameSize() {
    const element = frameRef.current
    if (!element) return null
    const rect = element.getBoundingClientRect()
    const width = Math.round(rect.width)
    if (width < 320) return null
    // Chrome (hint bar / pins strip / inspector) steals height from the frame
    // when it appears. Add it BACK so the capture height is the same whether
    // or not those bars are visible: full-bleed like a browser, yet stable
    // enough that the page never re-lays out mid-interaction.
    const host = element.parentElement
    let chrome = 0
    for (const sel of ['[data-nks-hint]', '[data-nks-pins]', '[data-nks-inspector]']) {
      const node = host?.querySelector(sel)
      if (node) chrome += node.getBoundingClientRect().height || 0
    }
    const height = Math.max(240, Math.min(2160, Math.round(rect.height + chrome)))
    return { width, height }
  }

  async function reloadShot(scroll, options = {}) {
    if (shotInFlightRef.current && options.fromResize) return
    shotInFlightRef.current = true
    try {
      return await reloadShotInner(scroll, options)
    } finally {
      shotInFlightRef.current = false
    }
  }

  async function loadDom(options = {}) {
    try {
      const data = await fetch(DOM).then((r) => r.json())
      if (data?.ok && data.srcdoc) {
        setDomDoc({ srcdoc: data.srcdoc, url: data.url, at: Date.now() })
        if (data.url && data.url !== 'about:blank') setPageUrl(data.url)
        return true
      }
    } catch { /* fall back to the screenshot */ }
    if (!options.keep) setDomDoc(null)
    return false
  }

  async function reloadShotInner(scroll, options = {}) {
    const fit = frameSize()
    const shotPayload = await post(SHOT, {
      format: 'webp',
      ...(scroll ? { scroll } : {}),
      ...(fit ? { fit } : {}),
    })
    setShot(shotPayload.data)
    setShotMime(shotPayload.mimeType || 'image/webp')
    setShotMeta({ url: shotPayload.url || '', scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || '', viewport: shotPayload.viewport?.width ?? null, at: Date.now() })
    if (shotPayload.url && shotPayload.url !== 'about:blank') setPageUrl(shotPayload.url)
    // A re-shoot for a layout change must NOT drop the note the human is
    // writing. Only an explicit navigation clears the selection.
    if (options.keepPick !== true) setPick(null)
  }

  async function historyNav(delta) {
    const moved = await post(HISTORY, { delta })
    if (moved.url) { setPageUrl(moved.url); setDraftUrl(moved.url) }
    await reloadShot()
  }

  async function onSubmitAddress(event) {
    event.preventDefault()
    if (!draftUrl.trim()) return
    event.currentTarget.querySelector('input')?.blur()
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
    // Native-HTML mode: the iframe document owns its own pointer events. The
    // setPointerCapture() below would retarget every later event to this
    // element and the iframe would never see a single click.
    if (event.target && event.target.tagName === 'IFRAME') return
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
          const reViewed = meta && pickPage.viewport && meta.viewport != null && pickPage.viewport.width !== meta.viewport
          if (drifted || scrolled || retargeted || reViewed) {
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
    // Native HTML owns its own scrolling: the iframe document scrolls exactly
    // like a real browser. Intercepting here is what made the page refuse to
    // move even though the scrollbar thumb changed.
    if (nativeHtml && domDoc) return
    // Screenshot mode: React attaches passive wheel listeners, so
    // preventDefault is a no-op. A drag in progress keeps its coordinates only
    // for THIS shot — scrolling mid-drag would remap the box onto a different
    // page (S3-4).
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
        ? multiNote(open.elements, { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` })
        : designNote(open.elements[0], { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` })
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
  sendPickRef.current = sendPick

  /** Current pick → note text (pure, no side effects). */
  function noteOf(element) {
    const open = element ? { elements: [element] } : pickRef.current
    if (!open?.elements?.length) return null
    return open.elements.length > 1
      ? multiNote(open.elements, { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` })
      : designNote(open.elements[0], { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` })
  }

  /**
   * Arrow: put a compact chip in the composer and keep the FULL payload on
   * the host. The composer must stay readable (Cursor's inline pill idea);
   * `⟦kitesurf:N⟧` resolves through GET /nano-kitesurf/context/N, so nothing
   * is truncated.
   */
  async function injectNote() {
    const note = noteOf()
    if (!note) return
    const element = pickRef.current?.elements?.[0] || null
    const label = element ? `${element.tag || 'element'}${element.text ? ' · ' + element.text.slice(0, 24) : ''}` : 'selection'
    try {
      // The host has no plugin-extensible chip: a bare ref would reach the
      // model as one meaningless token. So the DEFAULT is the full payload —
      // complete, never truncated. We still register a ref id so the same
      // packet can be re-pulled/resolved later, but the composer gets the text.
      let refId = null
      try {
        const saved = await post(CONTEXT, { text: note, packet: element, label })
        refId = saved.id
      } catch { /* ref bookkeeping is best-effort, never block the injection */ }
      insertComposerNote(note)
      setComment('')
      setComposing(false)
      setPick(null)
      showToast(refId ? `${note.length} 字符已注入（ref #${refId}）` : `${note.length} 字符已注入`)
    } catch (cause) {
      showError(cause)
    }
  }

  /** Copy: same context to the clipboard, no composer touch. */
  async function copyNote() {
    const note = noteOf()
    if (!note) return
    try {
      await navigator.clipboard.writeText(note)
      showToast(copy.copied)
    } catch {
      // Fallback for a page without the async clipboard permission.
      try {
        const area = document.createElement('textarea')
        area.value = note
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        area.remove()
        showToast(copy.copied)
      } catch (cause) { showError(cause) }
    }
  }

  /** Shift+arrow keeps the queue path used by "send all". */
  function pinNote() {
    const note = noteOf()
    if (!note) return
    try {
      setPins((current) => [...current, { text: note, anchor: pickRef.current?.anchor ?? null, shot }].slice(-MAX_PINS))
      setComment('')
      setComposing(false)
      setPick(null)
    } catch (cause) { showError(cause) }
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
    // Enter in the input = inject (never pin, never send to the model).
    if (event?.shiftKey) pinNote()
    else injectNote()
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

  /** One-click environment prep from the error state: repair, then re-shoot. */
  async function oneClickPrepare() {
    await run(async () => {
      try {
        const response = await post(RECOVER, {})
        const after = await refreshStatus()
        if (after?.ok !== false) await reloadShot(0, { keepPick: true })
        else if (response?.ports) showToast(`${copy.prepareFailed}`)
        else showToast(copy.prepareDone)
      } catch (cause) {
        showError(cause)
      }
    })
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

  function openHistory() { setHistoryOpen(true) }

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
        ...(annotate && hover && !pick ? [{ box: hover, kind: 'hover' }] : []),
      ]
  // Native-HTML mode has no <img>: derive the 1:1 frame at render time so the
  // selection box never depends on an async measurement effect firing.
  const activeFrame = frame || (nativeHtml && domDoc && frameRef.current
    ? (() => { const r = frameRef.current.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? { left: 0, top: 0, width: r.width, height: r.height, scale: 1 } : null })()
    : null)
  const overlays = activeFrame ? allBoxes.map(({ box, kind }) => ({
    kind,
    left: activeFrame.left + box.x * activeFrame.scale,
    top: activeFrame.top + box.y * activeFrame.scale,
    width: Math.max(box.width * activeFrame.scale, 2),
    height: Math.max(box.height * activeFrame.scale, 2),
  })) : []
  // about:blank still yields a (transparent) PNG — treat it as no page.
  const hasPage = !!shot && !!shotMeta?.url && shotMeta.url !== 'about:blank'
  const anchor = pick?.anchor
  const pickAnchor = (overlays.find((o) => o.kind === 'pick' || o.kind === 'ellipse'))
    || (activeFrame && anchor ? { left: activeFrame.left + anchor.x * activeFrame.scale, top: activeFrame.top + anchor.y * activeFrame.scale, width: 0, height: 0 } : null)
    || (activeFrame ? { left: activeFrame.left + 16, top: activeFrame.top + 16, width: 0, height: 0 } : null)

  // Browser chrome needs real left/right arrows — the primitives icon set
  // only ships chevron-up/down, so draw 16px strokes inline.
  const arrowGlyph = (dir) => h('svg', {
    width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  }, h('path', { d: dir === 'back' ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13' }))

  const glyph = (name) => {
    if (name === 'back' || name === 'forward') return arrowGlyph(name)
    const Icon = {
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
      copy: primitives.IconCopyOutlineRegular || primitives.IconEditOutlineRegular,
    }[name]
    return h(Icon, { width: 16, height: 16, 'aria-hidden': true })
  }

  /**
   * Environment self-check. Ordinary users should never have to read YAML or
   * run `container` in a terminal: this panel shows plugin build, engine
   * endpoint, container state and port ownership, and offers ONE button that
   * runs the whole repair chain (reconcile → adopt/repair port → start/resume
   * → health poll).
   */
  function EnvPanel() {
    const [snap, setSnap] = React.useState(null)
    const [busyLocal, setBusyLocal] = React.useState(false)
    const [note, setNote] = React.useState('')
    React.useEffect(() => {
      let alive = true
      fetch(PORTS).then((r) => r.json()).then((data) => { if (alive) setSnap(data) }).catch(() => {})
      return () => { alive = false }
    }, [])
    async function prepare() {
      setBusyLocal(true); setNote(copy.preparingEnv)
      try {
        const response = await fetch(RECOVER, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
        const result = await response.json().catch(() => ({}))
        const ports = result.ports || (await fetch(PORTS).then((r) => r.json()).catch(() => null))
        setSnap(ports)
        setNote(result.ok ? copy.prepareDone : copy.prepareFailed)
        await refreshStatus()
        await reloadShot(0, { keepPick: true }).catch(() => {})
      } catch (cause) {
        setNote(`${copy.prepareFailed}: ${cause?.message || cause}`)
      } finally {
        setBusyLocal(false)
      }
    }
    async function copyDiagnostics() {
      try {
        const data = await fetch(DIAGNOSTICS).then((r) => r.json())
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        showToast(copy.diagCopied)
      } catch (cause) { showError(cause) }
    }
    const engine = snap?.effective?.httpBase || '—'
    const container = snap?.container?.state || '—'
    const portRow = snap?.ports?.engine
      ? `${snap.ports.engine.port} · ${snap.ports.engine.heldBy === 'this-container' ? '本插件容器' : snap.ports.engine.heldBy === 'other' ? '被其他程序占用' : '空闲'}`
      : '—'
    const healthy = snap?.healthy === true
    return h('div', { className: 'nks-env', 'data-nks-env': '1' },
      h('div', { className: 'nks-env-title' }, copy.envTitle,
        h('span', { className: healthy ? 'nks-env-ok' : 'nks-env-bad' }, healthy ? '● OK' : '● 异常')),
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envPlugin), h('span', null, status?.buildId || '—')),
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envEngine), h('span', null, engine)),
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envContainer), h('span', null, container)),
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envPorts), h('span', null, portRow)),
      h('div', { className: 'nks-env-actions' },
        h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-prepare': '1', disabled: busyLocal, onClick: prepare }, busyLocal ? copy.preparingEnv : copy.prepareEnv),
        h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-copy-diag': '1', onClick: copyDiagnostics }, copy.copyDiag)),
      h('div', { className: 'nks-env-note' }, note || copy.envHint))
  }

  /**
   * In-pane DevTools. Every row is a real CDP event from the engine
   * (Runtime.consoleAPICalled / exceptionThrown / Log.entryAdded /
   * Network.requestWillBeSent → responseReceived → loadingFinished|Failed),
   * captured on the same socket the pane already holds. No Chromium.
   */
  /** Element packet from a node inside the native-HTML iframe (same origin). */
  function packetFromDom(el, doc, x, y) {
    const view = doc.defaultView
    const cs = view.getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const style = {}
    for (const k of ['color','backgroundColor','fontSize','fontFamily','fontWeight','lineHeight','display','position','margin','padding','border','borderRadius','width','height','flexDirection','justifyContent','alignItems','gap','zIndex','overflow']) {
      if (cs[k]) style[k] = String(cs[k])
    }
    const attrs = {}
    for (const k of ['id','class','role','aria-label','aria-expanded','href','src','type','name','alt','title','placeholder']) {
      const v = k === 'class' ? (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) : el.getAttribute?.(k)
      if (typeof v === 'string' && v.trim()) attrs[k] = v.trim().slice(0, 120)
    }
    const parts = []
    let node = el
    while (node && node.nodeType === 1 && parts.length < 8) {
      let tag = node.tagName.toLowerCase()
      if (node.id) { parts.unshift(`${tag}#${node.id}`); break }
      const parent = node.parentElement
      if (parent) {
        let same = 0, index = 0
        for (const child of parent.children) { if (child.tagName === node.tagName) { same += 1; if (child === node) index = same } }
        if (same > 1) tag += `:nth-of-type(${index})`
      }
      parts.unshift(tag)
      node = parent
    }
    const ancestors = []
    let up = el.parentElement
    while (up && ancestors.length < 6) {
      const cls = typeof up.className === 'string' ? up.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
      ancestors.push(up.tagName.toLowerCase() + (cls ? `.${cls}` : ''))
      up = up.parentElement
    }
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: typeof el.className === 'string' ? el.className.slice(0, 200) : '',
      selector: parts.join(' > '),
      text: (el.innerText || '').trim().slice(0, 200),
      alt: el.getAttribute?.('alt') || '',
      src: el.getAttribute?.('src') || '',
      box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
      style, attrs, ancestors,
      componentStack: null,
      parentSel: parts.length > 1 ? parts.slice(0, -1).join(' > ') : null,
      childSel: null,
    }
  }

  /**
   * Load the document ourselves instead of relying on srcDoc. srcDoc is
   * replaced whenever React re-sets the attribute, which orphaned the picker
   * listeners; document.write() gives a deterministic order:
   *   frame exists -> write -> close -> bind.
   */
  function writeDomFrame(frame) {
    if (!frame || !domDoc?.srcdoc) return
    if (frame.dataset.nksVersion === String(domDoc.at)) { bindDomFrame(frame); return }
    const doc = frame.contentDocument
    if (!doc) return
    frame.dataset.nksVersion = String(domDoc.at)
    doc.open()
    doc.write(domDoc.srcdoc)
    doc.close()
    // document.write() wipes every listener on the SAME Document object, so
    // the __nksBound marker must be cleared or the rebinding is skipped.
    try { delete doc.__nksBound } catch { /* frozen */ }
    bindDomFrame(frame)
  }

  /** Bind picking straight onto the iframe document — no postMessage hop. */
  function bindDomFrame(frame) {
    const doc = frame?.contentDocument
    if (!doc || doc.__nksBound) return
    doc.__nksBound = true
    try {
      const style = doc.createElement('style')
      style.textContent = '.__nks_hover{outline:1.5px dashed #7aaaff !important;outline-offset:-1px}'
      doc.documentElement.appendChild(style)
    } catch { /* ignore */ }
    let hovered = null
    const clearHover = () => { if (hovered) { hovered.classList.remove('__nks_hover'); hovered = null } }
    doc.addEventListener('mousemove', (e) => {
      if (!annotateRef.current) { clearHover(); return }
      clearHover()
      const el = doc.elementFromPoint(e.clientX, e.clientY)
      if (el) { el.classList.add('__nks_hover'); hovered = el }
    }, true)
    doc.addEventListener('click', (e) => {
      const dbg = (doc.defaultView.__nks = doc.defaultView.__nks || { fired: 0 })
      dbg.fired += 1
      dbg.mode = annotateRef.current
      if (!annotateRef.current) return
      e.preventDefault(); e.stopPropagation()
      const el = doc.elementFromPoint(e.clientX, e.clientY)
      dbg.hit = el ? el.tagName : null
      dbg.coords = [Math.round(e.clientX), Math.round(e.clientY)]
      if (!el) return
      clearHover()
      const packet = packetFromDom(el, doc, e.clientX, e.clientY)
      dbg.packet = !!packet
      setPick({ elements: [packet], anchor: { x: packet.box.x + packet.box.width / 2, y: packet.box.y + packet.box.height } })
      dbg.picked = true
      setEditing(false)
    }, true)
    doc.addEventListener('mouseleave', clearHover, true)
  }

  function HistoryDialog({ open, onClose }) {
    const [rows, setRows] = React.useState([])
    const [q, setQ] = React.useState('')
    const [busy, setBusy] = React.useState(false)
    const load = React.useCallback(async (needle) => {
      const data = await fetch(`${BROWSE_HISTORY}?limit=100${needle ? '&q=' + encodeURIComponent(needle) : ''}`).then((r) => r.json())
      setRows(data.entries || [])
    }, [])
    React.useEffect(() => { if (open) load('').catch(() => {}) }, [open, load])
    if (!open) return null
    const del = async (id) => { setBusy(true); try { await fetch(`${BROWSE_HISTORY}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); await load(q) } finally { setBusy(false) } }
    const clear = async () => { setBusy(true); try { await fetch(BROWSE_HISTORY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clear: true }) }); await load(q) } finally { setBusy(false) } }
    return h('div', { className: 'nks-modal-mask', 'data-nks-history': '1', onClick: (e) => { if (e.target === e.currentTarget) onClose() } },
      h('div', { className: 'nks-modal' },
        h('div', { className: 'nks-modal-head' },
          h('b', null, '浏览历史'),
          h('span', { className: 'nks-modal-sub' }, `${rows.length} 条`),
          h('button', { type: 'button', className: 'nks-modal-x', onClick: onClose, 'aria-label': '关闭' }, '×')),
        h('div', { className: 'nks-modal-bar' },
          h('input', { 'data-nks-history-q': '1', placeholder: '搜索地址…', value: q, onChange: async (e) => { setQ(e.target.value); await load(e.target.value) } }),
          h('button', { type: 'button', 'data-nks-history-clear': '1', disabled: busy || !rows.length, onClick: clear }, '清空')),
        h('div', { className: 'nks-modal-body' },
          rows.length ? rows.map((row) => h('div', { className: 'nks-hist-row', key: row.id, 'data-nks-history-row': row.id },
            h('button', { type: 'button', className: 'nks-hist-open', onClick: () => { setDraftUrl(row.url); setHistoryOpen(false); run(() => navigate(row.url)) } },
              h('span', { className: 'nks-hist-url' }, row.url),
              h('span', { className: 'nks-hist-meta' }, `${String(row.at).slice(0, 16).replace('T', ' ')}${row.count > 1 ? ' · ' + row.count + ' 次' : ''}`)),
            h('button', { type: 'button', className: 'nks-hist-del', 'data-nks-history-del': row.id, onClick: () => del(row.id), 'aria-label': '删除' }, '×')))
            : h('div', { className: 'nks-modal-empty' }, '还没有浏览记录'))) )
  }

  function DevTools({ open, onClose }) {
    const [tab, setTab] = React.useState('console')
    const [rows, setRows] = React.useState([])
    const [failedOnly, setFailedOnly] = React.useState(false)
    const [styles, setStyles] = React.useState(null)
    React.useEffect(() => {
      if (!open) return undefined
      let alive = true
      const load = async () => {
        try {
          if (tab === 'console') {
            const data = await fetch(`${CONSOLE}?limit=200`).then((r) => r.json())
            if (alive) setRows(data.entries || [])
          } else if (tab === 'network') {
            const data = await fetch(`${NETWORK}?limit=200${failedOnly ? '&failedOnly=true' : ''}`).then((r) => r.json())
            if (alive) setRows(data.entries || [])
          } else {
            const data = await fetch(`${ELEMENTS}?depth=3`).then((r) => r.json())
            if (alive) setRows(data.nodes || [])
          }
        } catch { /* endpoint may be briefly unavailable */ }
      }
      load()
      const timer = window.setInterval(load, 1500)
      return () => { alive = false; clearInterval(timer) }
    }, [open, tab, failedOnly])
    if (!open) return null
    const inspectNode = async (row) => {
      const selector = row.id ? `${row.tag}#${row.id}` : (row.cls ? `${row.tag}.${String(row.cls).trim().split(/\s+/)[0]}` : row.tag)
      try {
        const data = await fetch(`${ELEMENTS}?selector=${encodeURIComponent(selector)}`).then((r) => r.json())
        setStyles({ selector, matched: data.matched?.matched || [], computed: data.computed || {} })
      } catch { setStyles({ selector, matched: [], computed: {} }) }
    }
    const clear = async () => {
      const path = tab === 'console' ? CONSOLE : NETWORK
      await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"clear":true}' }).catch(() => {})
      setRows([])
    }
    return h('div', { className: 'nks-dt', 'data-nks-devtools': '1' },
      h('div', { className: 'nks-dt-head' },
        h('button', { type: 'button', className: 'nks-dt-tab', 'aria-selected': tab === 'console' ? 'true' : 'false', 'data-nks-dt-console': '1', onClick: () => setTab('console') }, copy.devtoolsConsole),
        h('button', { type: 'button', className: 'nks-dt-tab', 'aria-selected': tab === 'network' ? 'true' : 'false', 'data-nks-dt-network': '1', onClick: () => setTab('network') }, copy.devtoolsNetwork),
        h('button', { type: 'button', className: 'nks-dt-tab', 'aria-selected': tab === 'elements' ? 'true' : 'false', 'data-nks-dt-elements': '1', onClick: () => setTab('elements') }, 'Elements'),
        tab === 'network' ? h('button', { type: 'button', className: 'nks-dt-tab', 'aria-selected': failedOnly ? 'true' : 'false', onClick: () => setFailedOnly((v) => !v) }, copy.devtoolsFailedOnly) : null,
        h('span', { style: { flex: 'auto' } }),
        h('button', { type: 'button', className: 'nks-dt-tab', 'data-nks-dt-clear': '1', onClick: clear }, copy.devtoolsClear),
        h('button', { type: 'button', className: 'nks-dt-tab', 'data-nks-dt-close': '1', onClick: onClose }, copy.devtoolsClose)),
      styles ? h('div', { className: 'nks-dt-styles', 'data-nks-dt-styles': '1' },
        h('div', { className: 'nks-dt-style-head' }, `${styles.selector} · ${styles.matched.length} rules · ${Object.keys(styles.computed).length} computed`),
        styles.matched.slice(0, 6).map((rule, i) => h('div', { className: 'nks-dt-rule', key: `r${i}` },
          h('b', null, rule.selector || '(anonymous)'),
          h('span', null, (rule.properties || []).slice(0, 6).join('; '))))) : null,
      tab === 'console' ? h('div', { className: 'nks-dt-cols' },
        h('span', { className: 'nks-dt-time' }, 'Time'),
        h('span', { className: 'nks-dt-lv' }, 'Level'),
        h('span', { className: 'nks-dt-msg', style: { textAlign: 'left' } }, 'Message'),
        h('span', { className: 'nks-dt-src' }, 'Source')) : null,
      tab === 'network' ? h('div', { className: 'nks-dt-cols' },
        h('span', { className: 'nks-dt-lv' }, 'Method'),
        h('span', { className: 'nks-dt-st' }, 'Status'),
        h('span', { className: 'nks-dt-type' }, 'Type'),
        h('span', { className: 'nks-dt-url nks-dt-grow', style: { maxWidth: 'none', textAlign: 'left' } }, 'URL'),
        h('span', { className: 'nks-dt-size' }, 'Size'),
        h('span', { className: 'nks-dt-dur' }, 'Time')) : null,
      h('div', { className: 'nks-dt-body', 'data-nks-dt-body': '1' },
        rows.length === 0 ? h('div', { className: 'nks-dt-empty' }, copy.devtoolsEmpty) : null,
        rows.map((row, index) => tab === 'elements'
          ? h('div', { className: 'nks-dt-row', key: `e${row.nodeId || index}`, style: { paddingLeft: `${8 + (row.level || 0) * 12}px`, cursor: 'pointer' }, onClick: () => inspectNode(row), 'data-nks-el-node': String(row.nodeId) },
            h('span', { className: 'nks-dt-lv' }, row.tag),
            h('span', { className: 'nks-dt-msg' }, `${row.id ? '#' + row.id : ''}${row.cls ? '.' + String(row.cls).split(/\s+/).slice(0, 2).join('.') : ''}`),
            h('span', { className: 'nks-dt-dur' }, row.childNodeCount ? String(row.childNodeCount) : ''))
          : tab === 'console'
          ? h('div', { className: 'nks-dt-row', key: `c${row.seq || index}` },
            h('span', { className: 'nks-dt-time' }, String(row.at || '').slice(11, 19)),
            h('span', { className: 'nks-dt-lv', 'data-lv': row.level }, row.level),
            h('span', { className: 'nks-dt-msg' }, row.text),
            h('span', { className: 'nks-dt-src' }, row.url ? `${row.url}${row.lineNumber != null ? ':' + row.lineNumber : ''}` : row.source || ''))
          : h('div', { className: 'nks-dt-row', key: `n${row.id || index}` },
            h('span', { className: 'nks-dt-lv' }, row.method),
            h('span', { className: 'nks-dt-st', 'data-bad': row.failed || (row.status && row.status >= 400) ? 'true' : 'false' }, row.failed ? 'ERR' : String(row.status || '…')),
            h('span', { className: 'nks-dt-url nks-dt-grow', 'data-bad': row.failed || (row.status || 0) >= 400 ? 'true' : 'false' }, row.url),
            h('span', { className: 'nks-dt-size' }, row.size == null ? '' : row.size > 1024 ? `${(row.size / 1024).toFixed(1)}kb` : `${row.size}b`),
            h('span', { className: 'nks-dt-dur' }, row.durationMs == null ? '' : `${row.durationMs}ms`)))))
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
        h(EnvPanel, null),
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
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-back': '1', 'aria-label': copy.back, title: copy.back, disabled: busy || !hasPage, onClick: () => run(() => historyNav(-1)) }, glyph('back')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-forward': '1', 'aria-label': copy.forward, title: copy.forward, disabled: busy || !hasPage, onClick: () => run(() => historyNav(1)) }, glyph('forward')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-reload': '1', 'aria-label': copy.refresh, title: copy.refresh, disabled: busy, onClick: onRefresh }, glyph('refresh')),
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
          onFocus: () => { addressFocusedRef.current = true },
          onBlur: () => { addressFocusedRef.current = false },
        }),
        h('button', { type: 'submit', className: 'nks-tool nks-go', 'aria-label': copy.go, disabled: busy }, glyph('go'))),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-history-open': '1', 'aria-label': copy.history, title: copy.history, disabled: busy, onClick: openHistory }, glyph('history')),
      h('button', {
        type: 'button',
        className: 'nks-tool',
        'data-nks-annotate': '1',
        'aria-pressed': annotate ? 'true' : 'false',
        style: { position: 'relative', zIndex: 5 },
        'aria-label': copy.annotate,
        title: copy.annotateTitle,
        onPointerDown: (event) => {
          event.preventDefault(); event.stopPropagation()
          setAnnotate((value) => {
            if (value) { setHover(null); setDraftBox(null); setDrag(null) }
            return !value
          })
        },
      }, glyph('annotate')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-settings': '1', 'aria-label': copy.settings, title: copy.settings, onClick: openSettings }, glyph('settings'))),
    h('div', { className: 'nks-status', 'data-nks-status': '1' },
      h('button', { type: 'button', 'data-nks-native-toggle': '1', 'aria-pressed': nativeHtml ? 'true' : 'false', title: '原生 HTML 渲染', onClick: () => { setNativeHtml((v) => !v); if (!nativeHtml) loadDom().catch(() => {}) } }, 'HTML'),
      h('button', { type: 'button', 'data-nks-devtools-toggle': '1', 'aria-pressed': devtoolsOpen ? 'true' : 'false', title: '开发者工具（⌘E 然后按 2）', onClick: () => setDevtoolsOpen((v) => !v) }, copy.devtools),
      h('select', {
        'data-nks-vp': '1',
        title: '页面视口（拟真）',
        value: vp ? String(vp.width) : 'fit',
        onChange: async (event) => {
          const value = event.target.value
          if (value === 'custom') { setVpCustom(true); return }
          setVpCustom(false)
          const next = value === 'fit' ? null : { width: Number(value), height: Number(value) === 390 ? 844 : 900 }
          setVp(next)
          try { await post(SETTINGS, { viewport: next }) } catch { /* local only */ }
        },
      }, h('option', { value: 'fit' }, '自适应'), h('option', { value: '1280' }, '1280×900'), h('option', { value: '768' }, '768×900'), h('option', { value: '390' }, '390×844'), h('option', { value: 'custom' }, '自定义…')),
      vpCustom ? h('input', {
        'data-nks-vp-w': '1', type: 'number', placeholder: '宽', style: { width: '52px' },
        onKeyDown: async (e) => { if (e.key !== 'Enter') return; const w = Number(e.currentTarget.value); if (w >= 240) { const next = { width: w, height: vp?.height || 900 }; setVp(next); setVpCustom(false); try { await post(SETTINGS, { viewport: next }) } catch {} } },
      }) : null,
      vpCustom ? h('input', {
        'data-nks-vp-h': '1', type: 'number', placeholder: '高', style: { width: '52px' },
        onKeyDown: async (e) => { if (e.key !== 'Enter') return; const h = Number(e.currentTarget.value); if (h >= 240) { const next = { width: vp?.width || 1280, height: h }; setVp(next); setVpCustom(false); try { await post(SETTINGS, { viewport: next }) } catch {} } },
      }) : null,
      h('span', { 'data-nks-mode': nativeHtml && domDoc ? 'html' : 'img', style: { color: nativeHtml && domDoc ? 'var(--dsw-alias-fill-success,#3fb950)' : 'var(--dsw-alias-fill-warning,#d29922)' } },
        nativeHtml && domDoc ? 'HTML 原生渲染' : 'IMG 截图回退'),
      h('span', { style: { flex: 'auto' } }),
      status?.buildId ? h('span', { style: { opacity: .6 } }, String(status.buildId).slice(0, 18)) : null),
    h(HistoryDialog, { open: historyOpen, onClose: () => setHistoryOpen(false) }),
    h(DevTools, { open: devtoolsOpen, onClose: () => setDevtoolsOpen(false) }),
    pins.length ? h('div', { className: 'nks-pins', 'data-nks-pins': String(pins.length), 'aria-live': 'polite' },
      `${pins.length} ${copy.pinsCount}${pins.length === MAX_PINS ? copy.pinsFull : ''}`,
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-undo-pin': '1', 'aria-label': copy.undoPin, onClick: () => setPins((current) => current.slice(0, -1)) }, glyph('undo')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-clear-pins': '1', 'aria-label': copy.clearPins, onClick: () => setPins([]) }, glyph('clear')),
      h('button', { type: 'button', className: 'nks-tool', 'data-nks-send-all': '1', 'aria-label': copy.sendAll, onClick: onSendAll }, glyph('send'))) : null,
    annotate && hasPage ? h('div', { className: 'nks-hint', 'data-nks-hint': '1' },
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
      nativeHtml && domDoc ? h('iframe', {
        ref: domFrameRef,
        className: 'nks-dom',
        title: 'Kitesurf page',
        sandbox: 'allow-scripts allow-same-origin',
        style: vp ? { width: `${vp.width}px`, height: `${vp.height}px`, flex: 'none', display: 'block', margin: '0 auto', background: '#fff' } : { width: '100%', height: '100%', display: 'block', border: 0 },
        ref: (el) => { domFrameRef.current = el; if (el) writeDomFrame(el) },
      }) : hasPage ? h('img', {
        alt: '',
        draggable: false,
        src: `data:${shotMime || 'image/webp'};base64,${shot}`,
        style: { pointerEvents: annotate ? 'none' : 'auto' },
      }) : h('div', { className: 'nks-empty', 'data-nks-empty': '' },
        // One container, one column: the old layout rendered an absolutely
        // positioned .nks-start on top of a flex-centred .nks-empty, which
        // painted the opaque Start button straight over the error text
        // ("引启动引擎答"). Everything below is a single vertical stack.
        h('div', { className: 'nks-empty-icon' }, glyph('annotate')),
        h('div', { className: 'nks-empty-title' },
          busy ? copy.opening
            : status?.engineMismatch === true ? copy.engineMismatch
            : status?.ok === false ? copy.errorTitle
            : copy.emptyTitle),
        !busy && status?.ok !== false && !status?.engineMismatch ? h('div', { className: 'nks-empty-body' }, copy.emptyBody) : null,
        !busy && status?.ok === false && !status?.engineMismatch ? h('div', { className: 'nks-empty-body' }, copy.errorBody) : null,
        !busy && status?.ok === false ? h('div', { className: 'nks-empty-actions' },
          // Ordinary users get ONE button: it reconciles phase, adopts or
          // repairs the port, starts/resumes the container and polls health.
          h('button', {
            type: 'button',
            className: 'nks-start-btn nks-primary',
            'data-nks-start-engine': '1',
            'data-nks-prepare': '1',
            onClick: oneClickPrepare,
          }, status?.kite?.phase === 'running' ? copy.resumeEngine : copy.prepareEnv),
          h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-diagnose': '1', onClick: () => run(() => refreshStatus()) }, copy.retry),
          h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-open-settings': '1', onClick: openSettings }, copy.settings)) : null,
        !busy && status?.ok !== false && !status?.engineMismatch ? h('div', { className: 'nks-empty-actions' },
          h('button', { type: 'button', className: 'nks-empty-link', 'data-nks-try': '1', onClick: () => { setDraftUrl('https://example.com'); run(() => navigate('https://example.com')) } }, copy.emptyTry)) : null,
        status?.ok === false ? h('div', { className: 'nks-empty-meta' }, `${status?.lastError?.errorId || status?.errorId || 'kitesurf.engine.failed'} · ${status?.httpBase || ''}`) : null,
        status?.ok === false ? h('div', { className: 'nks-empty-meta' }, status?.lastError?.error || status?.error || '') : null),
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
      pickAnchor && pick ? h('div', {
        className: 'nks-note',
        'data-nks-note': '1',
        onClick: (event) => event.stopPropagation(),
        onPointerDown: (event) => event.stopPropagation(),
        onPointerMove: (event) => event.stopPropagation(),
        onPointerUp: (event) => event.stopPropagation(),
        style: {
          left: Math.max(8, Math.min(pickAnchor.left, Math.max(8, (frameRef.current?.clientWidth || 320) - 260))),
          top: pickAnchor.top + pickAnchor.height + 8 > (frameRef.current?.clientHeight || 0) - 44
            ? Math.max(8, pickAnchor.top - 44)
            : pickAnchor.top + pickAnchor.height + 8,
        },
      },
        pick.elements.length > 1 ? h('span', { 'data-nks-multi': String(pick.elements.length) }, `×${pick.elements.length}`) : null,
        editing ? h('form', { className: 'nks-note-form', onSubmit: onSend },
          h('input', {
            'aria-label': copy.editAria,
            'data-nks-comment': '1',
            value: comment,
            placeholder: copy.editPlaceholder,
            autoFocus: true,
            onChange: (event) => setComment(event.target.value),
          }),
          h('button', { type: 'submit', className: 'nks-tool', 'data-nks-send': '1', 'aria-label': copy.editSend }, glyph('edit'))) : null,
        !editing ? (composing ? h('form', { className: 'nks-note-form', onSubmit: onSend },
          h('input', {
            'aria-label': copy.noteAria,
            'data-nks-comment': '1',
            value: comment,
            placeholder: copy.notePlaceholder,
            autoFocus: true,
            onChange: (event) => setComment(event.target.value),
          }),
          h('button', { type: 'submit', className: 'nks-tool', 'data-nks-send': '1', title: copy.injectContext, 'aria-label': copy.injectContext }, glyph('send'))) : h('div', { className: 'nks-note-actions' },
          h('button', {
            type: 'button',
            className: 'nks-tool',
            'data-nks-send': '1',
            title: copy.injectContext,
            'aria-label': copy.injectContext,
            onClick: (event) => { if (event.shiftKey) pinNote(); else injectNote() },
          }, glyph('send')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-copy-note': '1', title: copy.copyContext, 'aria-label': copy.copyContext, onClick: copyNote }, glyph('copy')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-compose': '1', title: copy.inputContext, 'aria-label': copy.inputContext, onClick: () => setComposing(true) }, glyph('annotate')))) : null) : null),
    // Inspector strip: the picked element's live computed styles under the
    // frame — Cursor's design-mode sidebar reduced to one readable row.
    pick?.elements?.[0] && pick.elements[0].style && Object.keys(pick.elements[0].style).length ? h('div', { className: 'nks-inspector', 'data-nks-inspector': '1' },
      h('span', null, h('b', null, pick.elements[0].selector || pick.elements[0].tag)),
      pick.elements[0].style.color ? h('span', null, `color ${pick.elements[0].style.color}`) : null,
      pick.elements[0].style.fontSize ? h('span', null, `font ${pick.elements[0].style.fontSize}`) : null,
      pick.elements[0].style.fontFamily ? h('span', null, pick.elements[0].style.fontFamily.split(',')[0].replace(/["']/g, '')) : null,
      pick.elements[0].style.display ? h('span', null, pick.elements[0].style.display) : null,
      pick.elements[0].box ? h('span', null, `${Math.round(pick.elements[0].box.width)}×${Math.round(pick.elements[0].box.height)}`) : null,
      Array.isArray(pick.elements[0].componentStack) && pick.elements[0].componentStack.length
        ? h('span', { 'data-nks-stack': '1', title: pick.elements[0].componentStack.join(' → ') },
            `⚛ ${pick.elements[0].componentStack.slice(-3).join(' → ')}`) : null) : null,
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
