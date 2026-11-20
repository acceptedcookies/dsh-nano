/** Right-workspace browser. The page is the canvas; annotate picks on it. */

const React = require('react')
const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
const { createThemeScope, openNanoDialog, openNanoMenu, NANO_STYLES, NanoToast, NanoTabs } = require('dsh-nano-ui')
const { ensurePerfReview } = require('dsh-performance-review/client')
const { BUCKETS, DECL_HASH } = require('../../lib/perf-declaration.js')
const { copyFor } = require('./i18n.js')
const { batchNote, designNote, multiNote } = require('../shared/note.js')
const { contentFrame, shotPoint } = require('../shared/shot-point.js')
const { captureNavigation, requestTimeout } = require('../shared/navigation.js')
const { createManagedDesignClient, listSandboxRows } = require('../shared/managed-client.js')
const h = React.createElement

const STATUS = '/nano-local-sandbox/status'
const OPEN = '/nano-local-sandbox/open'
const SHOT = '/nano-local-sandbox/shot'
const PICK = '/nano-local-sandbox/pick'
const EDIT = '/nano-local-sandbox/edit'
const SETTINGS = '/nano-local-sandbox/settings'
const HISTORY = '/nano-local-sandbox/history'
const PORTS = '/nano-local-sandbox/ports'
const DIAGNOSTICS = '/nano-local-sandbox/diagnostics'
const CONSOLE = '/nano-local-sandbox/console'
const NETWORK = '/nano-local-sandbox/network'
const ELEMENTS = '/nano-local-sandbox/elements'
const BROWSE_HISTORY = '/nano-local-sandbox/browse-history'
const LOGS = '/nano-local-sandbox/logs'
const DOM = '/nano-local-sandbox/dom'
const CONTROL = '/nano-local-sandbox/control'
const LIFECYCLE = '/nano-local-sandbox/lifecycle'
const KIND = 'kitesurf'
const OWN_ID = 'nano-kitesurf'
const CAPTURE_HEIGHT = 800
const MAX_PINS = 8
const LAMP_PLANES = ['container', 'engine', 'page', 'dom', 'bridge']

function fill(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
}

/** Rows for the lamp. Identity is planes[id], not a second boolean and not a language-specific label. */
function planeRows(snap, copy) {
  const labels = {
    container: copy?.envContainer,
    engine: copy?.envEngine,
    page: copy?.planePage,
    dom: copy?.planeDom,
    bridge: copy?.planeBridge,
  }
  const planes = snap?.planes
  if (!planes || typeof planes !== 'object') return []
  return LAMP_PLANES.filter((id) => planes[id]).map((id) => {
    const row = planes[id]
    const skipped = row.state === 'skipped' || row.skipped === true
    return {
      plane: id,
      label: labels[id] || id,
      ok: row.ok === true,
      skipped,
      detail: row.detail || row.url || row.state || '',
    }
  })
}

/** DNLS owns the engine endpoint truth; the pane reads only its lifecycle block. */
function engineEndpoint(payload) {
  const lifecycle = payload?.lifecycle
  return {
    phase: lifecycle?.phase ?? null,
    httpBase: lifecycle?.httpBase ?? null,
    mcpPort: lifecycle?.mcpPort ?? null,
  }
}

const pagePerf = ensurePerfReview()
const perf = {
  span(name, fn) {
    try {
      const collector = pagePerf.join(OWN_ID, {
        version: typeof __NKS_VERSION__ === 'string' ? __NKS_VERSION__ : '0.0.0',
        buckets: BUCKETS,
        decl: DECL_HASH,
        react: React,
        root: () => document.querySelector('[data-nks-workspace]'),
      })
      if (collector?.span) return collector.span(name, fn)
    } catch { /* collector unavailable */ }
    return fn()
  },
}

const STYLE = `
.nks-root{position:relative;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;flex:auto;display:flex;font:var(--dsw-font-xxs-12);container-type:inline-size}
/*
 * Left-slide vertical tab drawer — DSH sidebar artwork: the rail stays mounted
 * off the left edge (translateX), sliding in/out on one gesture while
 * visibility flips after the slide on close and before it on open. The way
 * Expand/collapse lives in the toolbar (panel glyph, mirrored while open —
 * one affordance, both directions). The drawer holds only the tab list;
 * browser controls stay on the toolbar — ExpandButton.tsx / SidebarRight.module.css in dsh artwork.
 */
.nks-toolbar{position:relative;z-index:var(--nano-layer-local3);box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:8px;height:38px;padding:5px 6px;display:flex}
.nks-nav{position:absolute;z-index:var(--nano-layer-local4);top:44px;left:10px;bottom:36px;width:216px;display:flex;flex-direction:column;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);box-shadow:var(--dsw-elevation-prominent,0 4px 18px rgba(0,0,0,.3));transform:translateX(calc(-100% - 12px));visibility:hidden;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease),visibility 0s linear var(--ds-transition-duration-slow,.32s)}
.nks-nav[data-nks-nav-state="open"]{transform:none;visibility:visible;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease)}
@starting-style{.nks-nav[data-nks-nav-state="open"]{transform:translateX(calc(-100% - 12px))}}
@media (prefers-reduced-motion:reduce){.nks-nav,.nks-nav[data-nks-nav-state="open"]{transition:none}}
.nks-nav-head{display:flex;flex:none;align-items:center;gap:6px;height:30px;padding:0 10px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-nav-head b{flex:auto;font-weight:600;color:var(--dsw-alias-label-secondary)}
/* nano-ui-exempt: 宿主没有可关闭的文档页签条（SegmentedControl 不可关闭、无计数） */
.nks-nav-tabs{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px}
.nks-nav-tab{position:relative;display:flex;align-items:center;gap:7px;width:100%;box-sizing:border-box;min-height:30px;padding:4px 26px 4px 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);text-align:left;cursor:pointer}
.nks-nav-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-nav-tab[data-current="true"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-markdown-tag,var(--dsw-alias-bg-layer-3))}
.nks-nav-tab[data-current="true"]:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-nav-tab svg{flex:none;width:14px;height:14px;opacity:.8}
.nks-nav-tab .nks-nav-tab-url{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-nav-tab .nks-nav-tab-count{flex:none;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.nks-nav-tab .nks-nav-tab-x{position:absolute;right:4px;top:50%;margin-top:-9px;width:18px;height:18px;display:none;align-items:center;justify-content:center;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:var(--dsw-font-xxxs-11);line-height:1;padding:0}
.nks-nav-tab:hover .nks-nav-tab-x{display:inline-flex}
.nks-nav-tab .nks-nav-tab-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.nks-nav-empty{flex:auto;padding:12px 8px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);text-align:center}
.nks-tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;background:transparent;border:0;flex:none;justify-content:center;align-items:center;padding:6px;display:inline-flex;box-sizing:border-box}
.nks-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.nks-tool:disabled{color:var(--dsw-alias-label-tertiary,rgba(207,211,214,.55));opacity:.45;cursor:default}
.nks-tool:disabled:hover{background:transparent}
.nks-tool:focus-visible,.nks-address:focus-visible{outline:2px solid var(--dsw-alias-link);outline-offset:1px}
.nks-tool[aria-pressed="true"]{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-link) 18%,transparent)}
.nks-tool-glyph{display:inline-flex}
/* Matches the host workspace tab (_tabActive_123xe): markdown-tag fill,
   radius-sm, 28px tall, strip inline-start margin 10px (toolbar padding is
   6px, so 4px extra here lands the button's left edge on the same axis). */
.nks-nav-toggle{width:auto;height:28px;margin-left:4px;padding:0 10px;gap:5px;box-sizing:border-box;background:var(--dsw-alias-markdown-tag,var(--dsw-alias-bg-layer-2));border:0;border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xxs-12);font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-primary);white-space:nowrap}
.nks-tool.nks-nav-toggle:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.nks-tool.nks-nav-toggle[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link) 14%,var(--dsw-alias-markdown-tag,var(--dsw-alias-bg-layer-2)))}
.nks-toolbar-nav{display:flex;flex:none;align-items:center;gap:8px}
.nks-toolbar-tail{display:flex;flex:none;align-items:center;gap:8px}
.nks-address-box{flex:auto;min-width:0;position:relative}
.nks-address{box-sizing:border-box;width:100%;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 32px 0 9px}
.nks-address::placeholder{color:var(--dsw-alias-label-tertiary)}
.nks-address-box[data-loading="true"] .nks-address{padding-right:84px;border-color:color-mix(in srgb,var(--dsw-alias-link) 48%,var(--dsw-alias-border-l2));background-image:linear-gradient(100deg,color-mix(in srgb,var(--dsw-alias-link) 10%,var(--dsw-alias-bg-layer-1)) 18%,color-mix(in srgb,var(--dsw-alias-link) 30%,var(--dsw-alias-bg-layer-1)) 42%,color-mix(in srgb,var(--dsw-alias-link) 10%,var(--dsw-alias-bg-layer-1)) 66%);background-size:220% 100%;animation:nks-address-sheen 1.7s linear infinite}
.nks-address-box[data-loading="true"]::after{content:"";position:absolute;left:6px;right:6px;bottom:1px;height:2px;border-radius:2px;pointer-events:none;background:linear-gradient(90deg,transparent 10%,var(--dsw-alias-link) 50%,transparent 90%);background-size:200% 100%;animation:nks-address-sheen 1.4s linear infinite}
.nks-address-beat{position:absolute;right:34px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 3px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;pointer-events:none}
.nks-address-beat .nks-spin{width:11px;height:11px;border-width:1.5px}
@keyframes nks-address-sheen{0%{background-position:120% 0}100%{background-position:-120% 0}}
@media (prefers-reduced-motion:reduce){.nks-address-box[data-loading="true"] .nks-address{animation:none;background-image:none;background:var(--dsw-alias-bg-layer-1)}.nks-address-box[data-loading="true"]::after{animation:none;background:var(--dsw-alias-link)}}
.nks-go{visibility:hidden;opacity:0;position:absolute;top:0;right:0}
.nks-address-box:focus-within .nks-go,.nks-address-box[data-dirty="true"] .nks-go{visibility:visible;opacity:1}
.nks-frame{position:relative;isolation:isolate;order:1;overflow:auto;flex:auto;min-height:0;overflow:hidden;contain:layout paint;background:var(--dsw-alias-bg-layer-1)}
.nks-dom{width:100%;height:100%;border:0;display:block;background:#fff}
.nks-frame img{width:100%;height:100%;object-fit:contain;object-position:center;display:block}
.nks-empty{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.nks-empty-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-link,#2f6fed);border:.5px solid var(--dsw-alias-border-l2)}
.nks-empty-title{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13,var(--dsw-font-xxs-12));font-weight:600}
.nks-empty-body{max-width:340px;line-height:1.55}
.nks-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:2px}
.nks-empty-link{color:var(--dsw-alias-link,#2f6fed);cursor:pointer;background:none;border:0;font:inherit;padding:0;text-decoration:underline;text-underline-offset:2px}
.nks-empty-meta{font:var(--dsw-font-xxxs-11);opacity:.75;word-break:break-all;max-width:340px}
.nks-sandbox-bar{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:.5px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xxs-12)}
.nks-sandbox-bar select{flex:1;min-width:0;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px;font:inherit}
.nks-box{position:absolute;border:1.5px solid var(--dsw-alias-link,#2f6fed);box-shadow:0 0 0 1px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.55);pointer-events:none}
.nks-box[data-kind="ellipse"]{border-radius:50%}
.nks-box[data-kind="hover"]{border-style:dashed;opacity:.75}
.nks-pin-dot{position:absolute;width:18px;height:18px;margin-left:-9px;margin-top:-9px;color:#fff;font:var(--dsw-font-xxxs-11);line-height:18px;text-align:center;background:var(--dsw-alias-link,#2f6fed);box-shadow:0 0 0 1.5px rgba(0,0,0,.45),0 1px 4px rgba(0,0,0,.4);border-radius:50%;pointer-events:auto;cursor:pointer;user-select:none}
.nks-pin-dot:hover{background:var(--dsw-alias-state-error-primary);transform:scale(1.15)}
.nks-float-top{position:absolute;z-index:var(--nano-layer-local3);top:0;left:0;right:0;display:flex;flex-direction:column;pointer-events:none}
.nks-hint{position:relative;flex:none;pointer-events:auto;padding:3px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:6px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-hint-text{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-start-btn{height:30px;padding:0 14px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);cursor:pointer}
.nks-start-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-inspector{position:absolute;z-index:var(--nano-layer-local3);left:0;right:0;bottom:0;pointer-events:none;padding:3px 8px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;gap:10px;overflow:hidden;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);border-top:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.nks-inspector b{font-weight:500;color:var(--dsw-alias-label-secondary)}
.nks-inspector span{overflow:hidden;text-overflow:ellipsis;max-width:170px}
.nks-note{position:absolute;z-index:var(--nano-layer-local2);display:flex;gap:4px;align-items:center;padding:4px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-elevation-soft)}
/* HITL control bar — ego's bottom "Agent 正在控制 / 接管 / 终止任务" pill,
   reworded honestly: the pane can hold the agent's page writes, it cannot
   kill the run (that is host-side). Positioned bottom-center of the frame. */
.nks-hitl{position:absolute;right:10px;bottom:10px;z-index:var(--nano-layer-local4);display:flex;align-items:center;gap:8px;height:32px;padding:4px 8px 4px 12px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);box-shadow:var(--dsw-elevation-soft);font:var(--dsw-font-xxs-12);white-space:nowrap}
.nks-hitl-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-link,#2f6fed);animation:nks-hitl-pulse 1.4s ease-in-out infinite}
.nks-hitl-dot[data-held="true"]{background:var(--dsw-alias-state-warn-primary);animation:none}
@keyframes nks-hitl-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.nks-hitl-label{color:var(--dsw-alias-label-primary)}
.nks-hitl-label b{font-weight:600;margin-left:4px}
.nks-hitl-btn{height:24px;padding:0 10px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);cursor:pointer}
.nks-hitl-btn:hover{background:var(--dsw-alias-bg-layer-3)}
.nks-hitl-primary{color:var(--dsw-alias-label-primary-inverted);background:var(--dsw-alias-link);border-color:transparent}
.nks-hitl-primary:hover{background:var(--dsw-alias-link);filter:brightness(1.08)}
.nks-act{position:absolute;left:50%;top:34px;transform:translateX(-50%);z-index:var(--nano-layer-local4);padding:4px 10px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);box-shadow:var(--dsw-elevation-soft);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);white-space:nowrap;pointer-events:none;animation:nks-act-in .18s ease-out}
.nks-act[data-ok="false"]{color:var(--dsw-alias-state-error-primary)}
/* last-good/导航仍在执行提示条：与 .nks-act 同款小药丸，悬停在画面顶部。 */
.nks-stale{position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:var(--nano-layer-local4);max-width:calc(100% - 32px);padding:4px 10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);border:.5px solid var(--dsw-alias-state-warn-primary);border-radius:var(--dsw-radius-sm);box-shadow:var(--dsw-elevation-soft);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:auto}
.nks-stale[data-nks-nav-busy="1"]{top:34px;border-color:var(--dsw-alias-border-l2)}
.nks-dom-tag{position:absolute;right:8px;top:8px;z-index:var(--nano-layer-local4);padding:2px 7px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 88%,transparent);border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);pointer-events:none;user-select:none}
@keyframes nks-act-in{from{opacity:0;transform:translateX(-50%) translateY(-4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.nks-note-actions{display:flex;gap:2px;align-items:center}
.nks-note-form{display:flex;gap:4px;align-items:center}
.nks-note input{width:220px;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 8px}
.nks-pins{position:relative;flex:none;pointer-events:auto;padding:2px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:4px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent)}
/* nano-ui-exempt: host primitives and nano-ui ship no indeterminate spinner. */
.nks-spin{width:14px;height:14px;box-sizing:border-box;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-link,#2f6fed);animation:nks-spin .8s linear infinite;flex:none}
@keyframes nks-spin{to{transform:rotate(360deg)}}
.nks-open-error{margin:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);line-height:1.55;word-break:break-word}
.nks-open-url{color:var(--dsw-alias-label-tertiary);unicode-bidi:plaintext}
.nks-open-repair{margin-top:10px;height:28px;padding:0 12px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);cursor:pointer}
.nks-open-repair:hover{background:var(--dsw-alias-bg-layer-3)}
.nks-open-log{margin:6px 0 0;max-height:140px;overflow:auto;padding:6px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all}
.nks-settings-body{display:flex;flex-direction:column;gap:8px}
.nks-simulation-body{min-height:0}
.nks-settings-stack{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:auto}
.nks-settings-section{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);margin-top:2px}
.nks-settings-pair{display:flex;gap:8px}
.nks-settings-pair .nks-address{flex:1;min-width:0}
.nks-settings-hint{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);line-height:1.5}
.nks-cookie-text{height:auto;min-height:72px;padding:6px 8px;resize:vertical;font:var(--dsw-font-xxxs-11);line-height:1.5}
.nks-status{position:relative;z-index:var(--nano-layer-local3);order:7;flex:none;display:flex;align-items:center;gap:8px;height:26px;padding:0 10px;border-top:.5px solid var(--dsw-alias-border-l3);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-status button{height:20px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer}
.nks-status button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-status button[aria-pressed="true"],.nks-status button[data-nks-native-toggle][aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link,#7aaaff) 22%,transparent);color:var(--dsw-alias-label-primary)}
.nks-status .nks-count[data-bad="true"]{color:var(--dsw-alias-state-error-primary)}
.nks-dt{flex:none;height:240px;min-height:120px;position:relative;z-index:var(--nano-layer-local6);order:8;border-radius:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border-top:.5px solid var(--dsw-alias-border-l2);min-height:0;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.nks-dt-head{flex:none;display:flex;align-items:center;gap:8px;min-height:32px;padding:3px 6px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
/* Drag the top edge: the panel is a workspace, not a fixed strip. */
.nks-dt-grip{position:absolute;left:0;right:0;top:-3px;height:7px;cursor:row-resize;z-index:var(--nano-layer-local2);touch-action:none}
.nks-dt-grip:hover{background:color-mix(in srgb,var(--dsw-alias-link) 35%,transparent)}
/* The host strip is sized for a full-width toolbar; three options in a 240px
   panel need the compact scale. */
.nks-dt-tabs{flex:none;display:flex;transform:scale(.82);transform-origin:left center}
.nks-dt[data-nks-dt-collapsed="true"]{height:auto;min-height:0}
.nks-dt[data-nks-dt-collapsed="true"] > *:not(.nks-dt-head):not(.nks-dt-grip){display:none}
.nks-dt-body{flex:auto;min-height:0;overflow:auto;font:11px/1.45 ui-monospace,Menlo,monospace}
.nks-dt-filterbar{flex:none;display:flex;align-items:center;gap:6px;height:36px;min-height:36px;box-sizing:border-box;padding:5px 6px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.nks-dt-filterbar .nks-dt-search{flex:1 1 130px;min-width:75px;height:24px;box-sizing:border-box;display:flex;align-items:center;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}
.nks-dt-filterbar .nks-dt-search:focus-within{border-color:var(--dsw-alias-state-business-primary)}
.nks-dt-filterbar .nks-dt-search input{width:100%;height:24px;padding:0;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit}
.nks-dt button,.nks-dt input{font:inherit}
.nks-dt-switch{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;cursor:pointer}
.nks-dt-cache{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);white-space:nowrap;cursor:help}
.nks-dt-cache b{font-weight:500;color:var(--dsw-alias-label-dimmed);border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 5px;font-size:10px}
.nks-dt-stats{flex:none;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nks-dt-cols{flex:none;display:flex;gap:6px;padding:3px 8px;color:var(--dsw-alias-label-dimmed);border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);font:var(--dsw-font-xxxs-11);font-size:11px;text-transform:uppercase;letter-spacing:.02em}
.nks-dt-cols span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-row{display:flex;gap:6px;padding:2px 8px;border-bottom:.5px solid color-mix(in srgb,var(--dsw-alias-border-l3) 45%,transparent);align-items:baseline;white-space:nowrap}
.nks-dt-row:nth-child(even){background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 45%,transparent)}
.nks-dt-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-dt-row[data-level="warn"],.nks-dt-row[data-level="warning"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,transparent);box-shadow:inset 2px 0 0 var(--dsw-alias-state-warn-primary)}
.nks-dt-row[data-level="error"],.nks-dt-row[data-level="exception"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);box-shadow:inset 2px 0 0 var(--dsw-alias-state-error-primary)}
.nks-dt-row[data-level="error"] .nks-dt-msg,.nks-dt-row[data-level="exception"] .nks-dt-msg{color:var(--dsw-alias-state-error-primary)}
.nks-dt-row[data-level="warn"] .nks-dt-msg,.nks-dt-row[data-level="warning"] .nks-dt-msg{color:var(--dsw-alias-state-warn-primary)}
.nks-dt-lv{flex:none;width:50px;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;font:var(--dsw-font-xxxs-11)}
.nks-dt-lv[data-lv="error"],.nks-dt-lv[data-lv="exception"]{color:var(--dsw-alias-state-error-primary)}
.nks-dt-lv[data-lv="warn"]{color:var(--dsw-alias-state-warn-primary)}
.nks-dt-lv[data-lv="network"]{color:var(--dsw-alias-link,#7aaaff)}
.nks-dt-msg{flex:auto;min-width:0;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary)}

.nks-dt-url{flex:1 1 auto;min-width:0;max-width:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);direction:ltr}
.nks-dt-grow{flex:1 1 auto;min-width:0}
.nks-dt-st{flex:none;width:44px;text-align:right}
.nks-dt-st[data-bad="true"]{color:var(--dsw-alias-state-error-primary)}
.nks-dt-dur{flex:none;width:64px;text-align:right;color:var(--dsw-alias-label-tertiary)}
.nks-dt-time{flex:none;width:64px;color:var(--dsw-alias-label-tertiary)}
.nks-dt-src{flex:none;max-width:32%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);text-align:right}
.nks-dt-type{flex:none;width:46px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-type[data-resource="script"],.nks-dt-type[data-resource="js"]{color:var(--dsw-alias-state-warn-primary)}
.nks-dt-type[data-resource="doc"]{color:var(--dsw-alias-link,#7aaaff)}
.nks-dt-type[data-resource="xhr"],.nks-dt-type[data-resource="fetch"]{color:var(--dsw-alias-state-success-primary)}
.nks-dt-type[data-resource="img"],.nks-dt-type[data-resource="css"],.nks-dt-type[data-resource="font"]{color:var(--dsw-alias-label-secondary)}
.nks-dt-size{flex:none;width:48px;text-align:right;color:var(--dsw-alias-label-tertiary)}
.nks-dt-wf{flex:none;width:96px;position:relative;height:10px;align-self:center}
.nks-dt-wf i{position:absolute;top:0;height:8px;min-width:2px;border-radius:2px;background:color-mix(in srgb,var(--dsw-alias-link,#7aaaff) 70%,transparent)}
.nks-dt-wf i[data-bad="true"]{background:var(--dsw-alias-state-error-primary)}
.nks-dt-wf i[data-pending="true"]{background:var(--dsw-alias-label-dimmed);opacity:.6}
.nks-net-detail{position:absolute;left:0;right:0;top:68px;bottom:0;z-index:var(--nano-layer-local7);display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border-top:.5px solid var(--dsw-alias-border-l2)}
.nks-net-detail-head{flex:none;display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.nks-net-detail-title{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11)}
.nks-net-detail-x{flex:none;width:20px;height:20px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;line-height:1}
.nks-net-detail-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-net-detail-tabs{flex:none;display:flex;align-items:center;gap:4px;padding:4px 8px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.nks-net-detail-body{flex:auto;min-height:0;overflow:auto;padding:6px 8px;color:var(--dsw-alias-label-secondary)}
.nks-net-section{margin-bottom:8px}
.nks-net-section > b{display:block;margin-bottom:3px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11);font-weight:600}
.nks-net-kv{display:flex;gap:8px;padding:1px 0;font:var(--dsw-font-xxxs-11);line-height:1.55}
.nks-net-kv b{flex:none;width:132px;color:var(--dsw-alias-label-tertiary);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-net-kv span{min-width:0;word-break:break-all;color:var(--dsw-alias-label-secondary)}
.nks-net-pre{margin:0;white-space:pre-wrap;word-break:break-word;font:var(--dsw-font-xxxs-11);line-height:1.55;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);padding:5px 6px;max-height:180px;overflow:auto}
.nks-net-empty{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);padding:2px 0}
.nks-dt-styles{flex:none;max-height:110px;overflow:auto;border-bottom:.5px solid var(--dsw-alias-border-l2);padding:4px 8px;background:var(--dsw-alias-bg-layer-1)}
.nks-dt-style-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);margin-bottom:3px}
.nks-dt-style-head > span{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-style-x{flex:none;width:20px;height:20px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;line-height:1}
.nks-dt-style-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-dt-rule{display:flex;gap:8px;padding:1px 0;color:var(--dsw-alias-label-tertiary)}
.nks-dt-rule b{color:var(--dsw-alias-link,#7aaaff);font-weight:500;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-rule span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-hist-panel{display:flex;flex-direction:column;min-height:0;max-height:360px}
.nks-hist-list{overflow:auto}
.nks-modal-mask{position:absolute;inset:0;z-index:var(--nano-layer-overlay);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}
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
.nks-hist-meta{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.nks-hist-del{width:24px;height:24px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.nks-hist-del:hover{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent)}
.nks-chip{height:22px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer}
.nks-chip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.nks-vp-input{height:22px;width:52px;padding:0 6px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11)}
.nks-dt-empty{padding:14px;color:var(--dsw-alias-label-tertiary)}
.nks-env{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:6px}
.nks-env-title{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);text-transform:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
.nks-env-row{display:flex;justify-content:space-between;gap:10px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-env-row b{font-weight:500;color:var(--dsw-alias-label-secondary);flex:none}
.nks-env-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;unicode-bidi:plaintext}
.nks-env-ok{color:var(--dsw-alias-state-success-primary)}
.nks-env-wait{color:var(--dsw-alias-label-tertiary)}
.nks-env-legacy{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);margin-left:6px}
.nks-logs{margin:0;max-height:380px;overflow:auto;white-space:pre-wrap;word-break:break-all;font:11px/1.45 ui-monospace,Menlo,monospace;color:var(--dsw-alias-label-secondary)}
.nks-env-bad{color:var(--dsw-alias-state-error-primary)}
.nks-env-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.nks-env-checks{display:flex;flex-direction:column;gap:2px;margin-top:2px;padding-top:4px;border-top:.5px solid var(--dsw-alias-border-l2)}
.nks-env-check{display:flex;align-items:baseline;gap:6px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-env-check b{font-weight:500;color:var(--dsw-alias-label-secondary);flex:none;min-width:34px}
.nks-env-check-dot{flex:none;width:10px;text-align:center}
.nks-env-check[data-ok="true"] .nks-env-check-dot{color:var(--dsw-alias-state-success-primary)}
.nks-env-check[data-ok="false"] .nks-env-check-dot{color:var(--dsw-alias-state-error-primary)}
.nks-env-check[data-ok="skip"] .nks-env-check-dot{color:var(--dsw-alias-label-tertiary);opacity:.7}
.nks-env-check-detail{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;unicode-bidi:plaintext}
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
  .nks-nav{width:200px}
  .nks-toolbar{gap:2px;padding:5px 4px}
  .nks-tool{width:26px;height:26px}
  .nks-address{padding:0 4px 0 7px;font-size:11px}
  .nks-address::placeholder{color:transparent}
  .nks-address-box::after{content:attr(data-address-short);position:absolute;left:8px;top:6px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);pointer-events:none}
  .nks-address-box:focus-within::after,.nks-address-box[data-dirty="true"]::after{content:none}
  .nks-go{display:none}
  .nks-pins{gap:2px}
  .nks-hint-text{font:var(--dsw-font-xxxs-11)}
}
/* Frame: never letterbox into a black void — a subtle checker makes the
   dead area read as "canvas", and the picture is centred by object-position. */
.nks-frame{background-image:linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%),linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%);background-size:16px 16px;background-position:0 0,8px 8px}
`

/** Bound requests without aborting before the host's method-specific budget. */
function postRequest(fetch, path, body) {
  const timeoutMs = requestTimeout(path)
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal: controller?.signal,
  }).catch((cause) => {
    if (cause?.name === 'AbortError') {
      const error = new Error(`request timed out after ${timeoutMs}ms`)
      error.errorId = 'kitesurf.engine.connect'
      throw error
    }
    throw cause
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.error || payload.reason || `request failed (${response.status})`)
      error.errorId = payload.errorId || payload.reason || 'kitesurf.unknown'
      throw error
    }
    return payload
  }).finally(() => { if (timer) window.clearTimeout(timer) })
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

const RESOURCE_LABELS = {
  Document: 'doc', Stylesheet: 'css', Image: 'img', Media: 'media', Font: 'font',
  Script: 'js', TextTrack: 'text', XHR: 'xhr', Fetch: 'fetch', Prefetch: 'prefetch',
  EventSource: 'sse', WebSocket: 'ws', Manifest: 'manifest', SignedExchange: 'sxg',
  Ping: 'ping', CSPViolationReport: 'csp', Preflight: 'preflight', Other: 'other',
}
const RESOURCE_FILTERS = ['Document', 'Stylesheet', 'Script', 'XHR', 'Fetch', 'Image', 'Font', 'Media', 'WebSocket', 'Other']
const CONSOLE_LEVELS = ['error', 'warn', 'info', 'log', 'debug']

function resourceTypeLabel(row) {
  const raw = String(row?.type || '').trim()
  if (raw) return RESOURCE_LABELS[raw] || raw.toLowerCase().slice(0, 8)
  const mime = String(row?.mimeType || '')
  if (mime.includes('javascript')) return 'js'
  if (mime.includes('css')) return 'css'
  if (mime.startsWith('image/')) return 'img'
  if (mime.startsWith('font/')) return 'font'
  if (mime.includes('json')) return 'json'
  if (mime.startsWith('text/html')) return 'doc'
  return mime.split(';')[0].replace(/^application\//, '').slice(0, 8) || 'other'
}

function formatSize(bytes) {
  // null/undefined 是「引擎没报」，不是 0：渲染成 0b/0ms 会把 pending 请求
  // 伪装成已完成的空响应。0 本身是合法大小，照常显示。
  if (bytes == null) return '—'
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n}b`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}kb`
  return `${(n / 1024 / 1024).toFixed(1)}mb`
}

function formatDuration(ms) {
  if (ms == null) return '—'
  const n = Number(ms)
  if (!Number.isFinite(n) || n < 0) return ''
  return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(2)}s`
}

function networkMatches(row, text) {
  const tokens = String(text || '').toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  const haystack = `${row.url || ''} ${row.method || ''} ${row.status ?? ''} ${row.type || ''} ${row.mimeType || ''}`.toLowerCase()
  return tokens.every((token) => {
    const at = token.indexOf(':')
    if (at < 1) return haystack.includes(token)
    const key = token.slice(0, at)
    const value = token.slice(at + 1)
    if (key === 'type') return String(row.type || '').toLowerCase().includes(value) || resourceTypeLabel(row).includes(value)
    if (key === 'method') return String(row.method || '').toLowerCase() === value
    if (key === 'status') {
      if (/^[1-5]xx$/.test(value)) return Math.floor(Number(row.status) / 100) === Number(value[0])
      return String(row.status ?? '') === value
    }
    return haystack.includes(token)
  })
}

function consoleMatches(row, text) {
  const needle = String(text || '').toLowerCase().trim()
  if (!needle) return true
  return `${row.level || ''} ${row.text || ''} ${row.url || ''} ${row.source || ''}`.toLowerCase().includes(needle)
}

function elementMatches(row, text) {
  const needle = String(text || '').toLowerCase().trim()
  if (!needle) return true
  return `${row.tag || ''} ${row.id || ''} ${row.cls || ''}`.toLowerCase().includes(needle)
}

function DevTools({ copy, open, onClose, fetch }) {
  const [tab, setTab] = React.useState('console')
  const [rows, setRows] = React.useState([])
  const [failedOnly, setFailedOnly] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [levelFilter, setLevelFilter] = React.useState('all')
  const [netDetail, setNetDetail] = React.useState(null)
  const [netDetailTab, setNetDetailTab] = React.useState('headers')
  const [styles, setStyles] = React.useState(null)
  const detailSeq = React.useRef(0)
  // The panel is a workspace, not a fixed strip: the human decides how much
  // room the page gives up. Height lives here so it survives a re-render.
  const [height, setHeight] = React.useState(240)
  const [collapsed, setCollapsed] = React.useState(false)
  const dragRef = React.useRef(null)

  function startResize(event) {
    event.preventDefault()
    event.stopPropagation()
    const startY = event.clientY
    const startHeight = height
    dragRef.current = { startY, startHeight }
    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)
    const move = (moveEvent) => {
      const next = startHeight + (startY - moveEvent.clientY)
      setHeight(Math.max(120, Math.min(Math.round(window.innerHeight * 0.75), next)))
    }
    const stop = () => {
      dragRef.current = null
      target.releasePointerCapture?.(event.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }
  React.useEffect(() => {
    if (!open) return undefined
    let alive = true
    let since = null
    let sinceSeq = null
    setRows([])
    const merge = (fresh, keyOf) => setRows((prev) => {
      if (!Array.isArray(fresh) || fresh.length === 0) return prev
      const seen = new Set(prev.map(keyOf))
      const extra = fresh.filter((r) => !seen.has(keyOf(r)))
      // 状态变化的行（pending → failed/finished）共用同一个 key：先按键做
      // 原位更新（新行胜出），再追加本轮新行。就算没有新行也要应用更新——
      // 否则一条 pending 之后的 failed 永远落不到界面上。
      const merged = prev.map((r) => fresh.find((f) => keyOf(f) === keyOf(r)) || r).concat(extra)
      return merged.slice(-400)
    })
    const load = async () => {
      try {
        if (tab === 'console') {
          // 后端按稳定 seq 供给增量：只带 sinceSeq 游标，首次全量。
          const url = sinceSeq != null ? `${CONSOLE}?limit=200&sinceSeq=${encodeURIComponent(sinceSeq)}` : `${CONSOLE}?limit=200`
          const data = await fetch(url).then((r) => r.json())
          if (alive && Array.isArray(data.entries)) {
            merge(data.entries, (r) => `c${r.seq ?? r.at}`)
            const lastSeq = data.entries.reduce((m, r) => Math.max(m, Number(r.seq) || 0), 0)
            if (lastSeq) sinceSeq = lastSeq
          }
        } else if (tab === 'network') {
          // since 语义是「updatedAt 之后的行」：游标取本批最大更新时间，
          // 同一 id 的 pending→failed 更新才会被下一批带回。
          const url = `${NETWORK}?limit=200${since ? `&since=${encodeURIComponent(since)}` : ''}`
          const data = await fetch(url).then((r) => r.json())
          if (alive && Array.isArray(data.entries)) {
            merge(data.entries, (r) => `n${r.id}`)
            const lastStart = data.entries.reduce((m, r) => Math.max(m, Number(r.updatedAt || r.startedAt) || 0), 0)
            if (lastStart) since = String(lastStart)
          }
        } else {
          const data = await fetch(`${ELEMENTS}?depth=3`).then((r) => r.json())
          if (alive) setRows(data.nodes || [])
        }
      } catch { /* endpoint may be briefly unavailable */ }
    }
    load()
    // Poll fast while the pane is visible; back off hard when the whole tab
    // is backgrounded — the devtools buffer is ring-shaped on the host so
    // nothing is lost while we idle.
    const period = () => (document.visibilityState === 'hidden' ? 15000 : 1500)
    let timer = 0
    const arm = () => { clearInterval(timer); timer = window.setInterval(load, period()) }
    const onVis = () => { arm(); if (document.visibilityState !== 'hidden') load() }
    document.addEventListener('visibilitychange', onVis)
    arm()
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [open, tab])
  if (!open) return null
  const visibleRows = rows.filter((row) => {
    if (tab === 'network') {
      if (failedOnly && !(row.failed || (row.status && row.status >= 400))) return false
      if (typeFilter !== 'all' && String(row.type || 'Other') !== typeFilter) return false
      return networkMatches(row, query)
    }
    if (tab === 'console') return (levelFilter === 'all' || String(row.level) === levelFilter) && consoleMatches(row, query)
    if (tab === 'elements') return elementMatches(row, query)
    return true
  })
  const elementCount = rows.filter((row) => row.tag && !String(row.tag).startsWith('#')).length
  const maxDepth = rows.reduce((depth, row) => Math.max(depth, Number(row.level) || 0), -1) + 1
  const openTypeMenu = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    openNanoMenu({
      anchor: { left: rect.left, top: rect.top, bottom: rect.bottom },
      container: event.currentTarget.closest('[data-nks-workspace]'),
      direction: 'down',
      maxHeight: 9 * 28 + 8,
      items: [
        { id: 'all', label: copy.devtoolsTypeAll, run: () => setTypeFilter('all') },
        ...RESOURCE_FILTERS.map((type) => ({ id: type, label: type, run: () => setTypeFilter(type) })),
      ],
    })
  }
  const openLevelMenu = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    openNanoMenu({
      anchor: { left: rect.left, top: rect.top, bottom: rect.bottom },
      container: event.currentTarget.closest('[data-nks-workspace]'),
      direction: 'up',
      maxHeight: 7 * 28 + 8,
      items: [
        { id: 'all', label: copy.devtoolsAllLevels, run: () => setLevelFilter('all') },
        ...CONSOLE_LEVELS.map((level) => ({ id: level, label: level.toUpperCase(), run: () => setLevelFilter(level) })),
      ],
    })
  }
  const openNetworkDetail = async (row) => {
    const seq = ++detailSeq.current
    setNetDetailTab('headers')
    setHeight((value) => Math.max(value, 360))
    setNetDetail({ entry: row, responseBody: null, loading: true, error: '' })
    try {
      const data = await fetch(`${NETWORK}?id=${encodeURIComponent(row.id)}`).then((response) => response.json())
      if (seq !== detailSeq.current) return
      if (!data?.ok || !data.entry) throw new Error(data?.error || copy.devtoolsDetailError)
      setNetDetail({ entry: data.entry, responseBody: data.responseBody, loading: false, error: '' })
    } catch (cause) {
      if (seq !== detailSeq.current) return
      setNetDetail({ entry: row, responseBody: null, loading: false, error: String(cause?.message || copy.devtoolsDetailError) })
    }
  }
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
    setNetDetail(null)
  }
  const kvRow = (label, value) => h('div', { className: 'nks-net-kv', key: label },
    h('b', null, label), h('span', null, String(value ?? '—')))
  const headerRows = (headers) => {
    const entries = Object.entries(headers || {})
    return entries.length
      ? entries.map(([key, value]) => h('div', { className: 'nks-net-kv', key }, h('b', null, key), h('span', null, String(value))))
      : h('div', { className: 'nks-net-empty' }, copy.devtoolsNoHeaders)
  }
  const netSection = (title, children) => h('div', { className: 'nks-net-section', key: title },
    h('b', null, title), children)
  const renderNetDetail = () => {
    if (!netDetail) return null
    if (netDetail.loading) return h('div', { className: 'nks-net-empty' }, copy.devtoolsLoading)
    if (netDetail.error) return h('div', { className: 'nks-net-empty' }, `${copy.devtoolsDetailError}: ${netDetail.error}`)
    const entry = netDetail.entry || {}
    if (netDetailTab === 'headers') {
      return [
        netSection(copy.devtoolsGeneral, [
          kvRow(copy.devtoolsRequestUrl, entry.url),
          kvRow(copy.devtoolsMethod, entry.method),
          kvRow(copy.devtoolsStatus, `${entry.status ?? '…'}${entry.statusText ? ' ' + entry.statusText : ''}`),
          kvRow(copy.devtoolsType, entry.type || 'Other'),
          kvRow(copy.devtoolsMimeType, entry.mimeType),
          kvRow(copy.devtoolsProtocol, entry.protocol),
          kvRow(copy.devtoolsRemoteAddress, entry.remoteAddress),
        ]),
        netSection(copy.devtoolsRequestHeaders, headerRows(entry.requestHeaders)),
        netSection(copy.devtoolsResponseHeaders, headerRows(entry.responseHeaders)),
      ]
    }
    if (netDetailTab === 'payload') {
      let queryRows = []
      try {
        const parsed = new URL(entry.url || '', 'http://local')
        queryRows = [...parsed.searchParams].map(([key, value], index) => h('div', { className: 'nks-net-kv', key: `${key}${index}` },
          h('b', null, key), h('span', null, value)))
      } catch { /* malformed URLs still show the raw body */ }
      return [
        queryRows.length ? netSection(copy.devtoolsQuery, queryRows) : null,
        netSection(copy.devtoolsRequestPayload, entry.postData
          ? h('pre', { className: 'nks-net-pre' }, entry.postData)
          : h('div', { className: 'nks-net-empty' }, copy.devtoolsNoPayload)),
      ]
    }
    const body = netDetail.responseBody
    return netSection(copy.devtoolsResponseBody, body == null
      ? h('div', { className: 'nks-net-empty' }, copy.devtoolsNoResponseBody)
      : body.body
        ? h('pre', { className: 'nks-net-pre' }, `${body.base64Encoded ? '[base64]\n' : ''}${body.body}${body.truncated ? '\n…' : ''}`)
        : h('div', { className: 'nks-net-empty' }, copy.devtoolsEmptyBody))
  }
  return h('div', {
    className: 'nks-dt',
    'data-nks-devtools': '1',
    'data-nks-dt-collapsed': collapsed ? 'true' : 'false',
    style: collapsed ? undefined : { height: `${height}px` },
  },
    // Drag the top edge to give the panel more or less room.
    h('div', {
      className: 'nks-dt-grip',
      'data-nks-dt-grip': '1',
      role: 'separator',
      'aria-orientation': 'horizontal',
      'aria-label': copy.devtoolsResize,
      onPointerDown: startResize,
    }),
    h('div', { className: 'nks-dt-head' },
      // View switch and row actions are host primitives; the
      // pane draws no tab chrome of its own (DESIGN.md §6.1). The strip is
      // scaled to the panel: at full size three options ate the whole header.
      h('div', { className: 'nks-dt-tabs' },
        h(primitives.SegmentedControl, {
          id: 'nks-dt-view',
          value: tab,
          label: copy.devtools,
          options: [
            { value: 'console', label: copy.devtoolsConsole },
            { value: 'network', label: copy.devtoolsNetwork },
            { value: 'elements', label: copy.devtoolsElementsTab },
          ],
          onChange: (next) => { setTab(next); if (next !== 'elements') setStyles(null); if (next !== 'network') setNetDetail(null) },
        })),
      h('span', { style: { flex: 'auto' } }),
      h(primitives.Button, { variant: 'ghost', size: 'sm', onClick: clear }, copy.devtoolsClear),
      h(primitives.Button, {
        variant: 'ghost',
        size: 'sm',
        'data-nks-dt-collapse': '1',
        'aria-expanded': collapsed ? 'false' : 'true',
        onClick: () => setCollapsed((value) => !value),
      }, collapsed ? copy.devtoolsExpand : copy.devtoolsCollapse),
      h(primitives.Button, { variant: 'ghost', size: 'sm', onClick: onClose }, copy.devtoolsClose)),
    h('div', { className: 'nks-dt-filterbar', 'data-nks-dt-filterbar': '1' },
      h(primitives.Input, {
        className: 'nks-dt-search',
        'data-nks-dt-search': '1',
        type: 'search',
        value: query,
        placeholder: tab === 'elements' ? copy.devtoolsSearchElements : tab === 'console' ? copy.devtoolsSearchConsole : copy.devtoolsSearch,
        'aria-label': tab === 'elements' ? copy.devtoolsSearchElements : tab === 'console' ? copy.devtoolsSearchConsole : copy.devtoolsSearch,
        onChange: (event) => setQuery(event.target.value),
      }),
      tab === 'console' ? h(primitives.Tooltip, { label: copy.devtoolsFilterLevel },
        h(primitives.Button, {
          variant: 'outline', size: 'sm', 'data-nks-dt-level': '1',
          'aria-label': `${copy.devtoolsFilterLevel}: ${levelFilter === 'all' ? copy.devtoolsAllLevels : levelFilter}`,
          onClick: openLevelMenu,
        }, levelFilter === 'all' ? copy.devtoolsAllLevels : levelFilter.toUpperCase())) : null,
      tab === 'network' ? h(primitives.Tooltip, { label: copy.devtoolsFilterType },
        h(primitives.Button, {
          variant: 'outline', size: 'sm', 'data-nks-dt-type': '1',
          'aria-label': `${copy.devtoolsFilterType}: ${typeFilter === 'all' ? copy.devtoolsTypeAll : typeFilter}`,
          onClick: openTypeMenu,
        }, typeFilter === 'all' ? copy.devtoolsTypeAll : typeFilter)) : null,
      tab === 'network' ? h(primitives.Tooltip, { label: copy.devtoolsFailedOnlyHint },
        h('label', { className: 'nks-dt-switch', 'data-nks-dt-failed': '1' },
          h(primitives.Switch, { checked: failedOnly, onChange: setFailedOnly, label: copy.devtoolsFailedOnly }),
          h('span', null, copy.devtoolsFailedOnly))) : null,
      tab === 'network' ? h(primitives.Tooltip, { label: copy.devtoolsCacheUnsupported },
        h('span', { className: 'nks-dt-cache', 'data-nks-dt-cache': '1', 'aria-disabled': 'true' },
          h(primitives.Switch, { checked: false, disabled: true, onChange: () => {}, label: copy.devtoolsDisableCache }),
          h('span', null, copy.devtoolsDisableCache),
          h('b', null, copy.devtoolsUnsupported))) : null,
      tab === 'elements' ? h('span', {
        className: 'nks-dt-stats', 'data-nks-dt-stats': '1', title: copy.devtoolsDomStatsHint,
      }, `${copy.devtoolsNodes} ${rows.length} · ${copy.devtoolsElements} ${elementCount} · ${copy.devtoolsDepth} ${maxDepth}`) : null),
    tab === 'elements' && styles ? h('div', { className: 'nks-dt-styles', 'data-nks-dt-styles': '1' },
      h('div', { className: 'nks-dt-style-head' },
        h('span', null, `${styles.selector} · ${styles.matched.length} rules · ${Object.keys(styles.computed || {}).length} computed`),
        h('button', {
          type: 'button', className: 'nks-dt-style-x', 'data-nks-dt-style-close': '1',
          'aria-label': copy.devtoolsCloseStyles, title: copy.devtoolsCloseStyles,
          onClick: () => setStyles(null),
        }, '×')),
      styles.matched.slice(0, 6).map((rule, i) => h('div', { className: 'nks-dt-rule', key: `r${i}` },
        h('b', null, rule.selector || copy.devtoolsAnonymous),
        h('span', null, (rule.properties || []).slice(0, 6).join('; '))))) : null,
    tab === 'elements' ? h('div', { className: 'nks-dt-cols' },
      h('span', { className: 'nks-dt-lv' }, copy.colTag),
      h('span', { className: 'nks-dt-msg', style: { textAlign: 'left' } }, copy.colElement),
      h('span', { className: 'nks-dt-dur' }, copy.colChildren)) : null,
    tab === 'console' ? h('div', { className: 'nks-dt-cols' },
      h('span', { className: 'nks-dt-time' }, copy.colTime),
      h('span', { className: 'nks-dt-lv' }, copy.colLevel),
      h('span', { className: 'nks-dt-msg', style: { textAlign: 'left' } }, copy.colMessage),
      h('span', { className: 'nks-dt-src' }, copy.colSource)) : null,
    tab === 'network' ? h('div', { className: 'nks-dt-cols' },
      h('span', { className: 'nks-dt-lv' }, copy.colMethod),
      h('span', { className: 'nks-dt-st' }, copy.colStatus),
      h('span', { className: 'nks-dt-type' }, copy.colType),
      h('span', { className: 'nks-dt-url nks-dt-grow', style: { maxWidth: 'none', textAlign: 'left' } }, copy.colUrl),
      h('span', { className: 'nks-dt-size' }, copy.colSize),
      h('span', { className: 'nks-dt-dur' }, copy.colDuration),
      h('span', { className: 'nks-dt-wf', style: { height: 'auto' } }, copy.colWaterfall)) : null,
    h('div', { className: 'nks-dt-body', 'data-nks-dt-body': '1' },
      visibleRows.length === 0 ? h('div', { className: 'nks-dt-empty' }, rows.length && tab === 'console' ? copy.devtoolsNoMatchConsole : rows.length && tab === 'network' ? copy.devtoolsNoMatch : copy.devtoolsEmpty) : null,
      visibleRows.map((row, index) => tab === 'elements'
        ? h('div', { className: 'nks-dt-row', key: `e${row.nodeId || index}`, style: { paddingLeft: `${8 + (row.level || 0) * 12}px`, cursor: 'pointer' }, onClick: () => inspectNode(row), 'data-nks-el-node': String(row.nodeId) },
          h('span', { className: 'nks-dt-lv' }, row.tag),
          h('span', { className: 'nks-dt-msg' }, `${row.id ? '#' + row.id : ''}${row.cls ? '.' + String(row.cls).split(/\s+/).slice(0, 2).join('.') : ''}`),
          h('span', { className: 'nks-dt-dur' }, row.childNodeCount ? String(row.childNodeCount) : ''))
        : tab === 'console'
        ? h('div', { className: 'nks-dt-row', key: `c${row.seq ?? row.at ?? index}`, 'data-level': row.level },
          h('span', { className: 'nks-dt-time' }, String(row.at || '').slice(11, 19)),
          h('span', { className: 'nks-dt-lv', 'data-lv': row.level }, row.level),
          h('span', { className: 'nks-dt-msg' }, row.text),
          h('span', { className: 'nks-dt-src' }, row.url ? `${row.url}${row.lineNumber != null ? ':' + row.lineNumber : ''}` : row.source || ''))
        : h('div', {
          className: 'nks-dt-row', key: `n${row.id || index}`,
          style: { cursor: 'pointer' }, 'data-nks-net-row': String(row.id || ''),
          'data-selected': netDetail?.entry?.id === row.id ? 'true' : 'false',
          onClick: () => openNetworkDetail(row),
        },
          h('span', { className: 'nks-dt-lv' }, row.method),
          h('span', { className: 'nks-dt-st', 'data-bad': row.failed || (row.status && row.status >= 400) ? 'true' : 'false' }, row.failed ? 'ERR' : String(row.status || '…')),
          h('span', { className: 'nks-dt-type', 'data-resource': resourceTypeLabel(row), title: `${row.type || 'Other'}${row.mimeType ? ' · ' + row.mimeType : ''}` }, resourceTypeLabel(row)),
          h('span', { className: 'nks-dt-url nks-dt-grow', 'data-bad': row.failed || (row.status || 0) >= 400 ? 'true' : 'false' }, row.url),
          h('span', { className: 'nks-dt-size', title: copy.devtoolsSizeHint }, formatSize(row.size)),
          h('span', { className: 'nks-dt-dur' }, formatDuration(row.durationMs)),
          h('span', { className: 'nks-dt-wf', 'data-nks-dt-wf': '1' }, wfBar(row, visibleRows))))),
    tab === 'network' && netDetail ? h('div', { className: 'nks-net-detail', 'data-nks-net-detail': '1' },
      h('div', { className: 'nks-net-detail-head' },
        h('b', { className: 'nks-net-detail-title', title: netDetail.entry?.url || '' },
          `${netDetail.entry?.method || 'GET'} ${netDetail.entry?.url || ''}`),
        h('button', {
          type: 'button', className: 'nks-net-detail-x', 'data-nks-net-detail-close': '1',
          'aria-label': copy.devtoolsDetailClose, title: copy.devtoolsDetailClose,
          onClick: () => setNetDetail(null),
        }, '×')),
      h('div', { className: 'nks-net-detail-tabs' },
        [['headers', copy.devtoolsHeaders], ['payload', copy.devtoolsPayload], ['response', copy.devtoolsResponse]]
          .map(([value, label]) => h(primitives.Button, {
            key: value, variant: netDetailTab === value ? 'outline' : 'ghost', size: 'sm',
            'data-nks-net-tab': value, onClick: () => setNetDetailTab(value),
          }, label))),
      h('div', { className: 'nks-net-detail-body' }, renderNetDetail())) : null)
}

// Waterfall scale is recomputed per render from the row set passed in:
// earliest startedAt is x=0, the last finished end is the span. Bars show
// start offset × duration so serial-vs-parallel traffic is visible at a
// glance; pending rows render a dim sliver at their start point.
function wfBar(row, rows) {
  const starts = rows.map((r) => Number(r.startedAt) || 0).filter(Boolean)
  const ends = rows.map((r) => (Number(r.startedAt) || 0) + (Number(r.durationMs) || 0)).filter(Boolean)
  const min = starts.length ? Math.min(...starts) : 0
  const span = Math.max(1, (ends.length ? Math.max(...ends) : min + 1) - min)
  const start = Number(row.startedAt) || 0
  const dur = Number(row.durationMs) || 0
  const left = Math.max(0, Math.min(100, ((start - min) / span) * 100))
  const width = dur > 0 ? Math.max(1.5, Math.min(100 - left, (dur / span) * 100)) : 1.5
  const pending = row.durationMs == null && !row.failed
  return h('i', { style: { left: `${left}%`, width: `${width}%` }, 'data-bad': row.failed || (row.status || 0) >= 400 ? 'true' : 'false', 'data-pending': pending ? 'true' : 'false' })
}

function BrowserPane({ copy, languageOf, theme, onThemeChange, fetch, sandboxId }) {
  const post = (path, body) => postRequest(fetch, path, body)
  // Per-object scratch notes live and die with the selected sandbox's mount.
  const localNotes = React.useRef([]).current
  const [status, setStatus] = React.useState(null)
  const engine = engineEndpoint(status)
  const statusDown = status != null && (status.ok === false || status.ready === false)
  // 超时返回的 /open 不等于导航被取消：引擎只在 navigation.outcome 里
  // 承认「还在飞」。
  const engineNavigating = status?.navigation?.outcome === 'in-flight'
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
  const [navOpen, setNavOpen] = React.useState(false)
  const [navTabs, setNavTabs] = React.useState([])
  // The engine's own render is the default surface, NOT the srcdoc iframe.
  // A srcdoc document inherits the HOST page's origin (https://<dsh host>),
  // so every http: subresource inside it is mixed content and Chrome blocks
  // it silently — the pane then shows an unstyled skeleton while the engine
  // (which loads the page in its own container) renders perfectly. Local dev
  // servers are http:, so "native HTML by default" made the common case the
  // broken one. Native HTML is an explicit opt-in and keeps real addresses —
  // the retired /res proxy is gone (T-O-66); missing styles on local http
  // pages is the deterministic price of the static projection, and the styled
  // surface stays the engine render.
  const [nativeHtml, setNativeHtml] = React.useState(false)
  const [domDoc, setDomDoc] = React.useState(null)
  // last-good 标记：导航/刷新失败时保留上一帧画面，并在画面上叠加
  // 「显示上次成功画面 …」提示；新导航成功后清除。
  const [staleNav, setStaleNav] = React.useState(false)
  // 最近写入 iframe 的 DOM 版本签名（domSeq/capturedAt/generation；旧宿主
  // 回退为 srcdoc 内容），轮询到同一版本就不再重写，保住滚动位置。
  const domVersionRef = React.useRef('')
  const [vp, setVp] = React.useState(null)
  const [vpCustom, setVpCustom] = React.useState(false)
  const domFrameRef = React.useRef(null)
  const [toast, setToast] = React.useState(null)
  // When the last error was an engine/recoverable failure, the toast gains a
  // one-click "fix environment" action so the user isn't left to hunt for it.
  const [toastFix, setToastFix] = React.useState(false)
  // HITL control state from /nano-local-sandbox/control (bridge proxy):
  // {writer,owner,ownerSince,lastWriteAt,humanHold,lastAction,lastCallAt}.
  const [control, setControl] = React.useState(null)
  // T-O-2: two tiers, never one boolean. `relayConns > 0` means a /cdp socket
  // is attached (the agent can see the page); `relayWriting` means a write was
  // forwarded in the last 90s. Collapsing them would make the bar claim an
  // agent is writing whenever it merely listens — a long-lived socket makes
  // "connected" permanently true.
  const relayConns = control?.relay?.conns || 0
  const relayWriting = relayConns > 0 && control?.relay?.lastAt
    ? Date.now() - Date.parse(control.relay.lastAt) < 90_000
    : false
  const [actionToast, setActionToast] = React.useState(null)
  const lastActionStamp = React.useRef('')
  const actionToastTimer = React.useRef(0)
  const [busy, setBusy] = React.useState(false)
  // Page-open heartbeat. `busy` is every action; `beat` is only a navigation,
  // so a settings save does not cover the page with a spinner.
  const [beat, setBeat] = React.useState(false)
  const [beatSec, setBeatSec] = React.useState(0)
  /** Preview box under the cursor before a click (throttled pick preview). */
  const [hover, setHover] = React.useState(null)
  /** Content-rect of the letterboxed image — state, never read during render. */
  const [frame, setFrame] = React.useState(null)
  const toastTimer = React.useRef(0)
  const workspaceRef = React.useRef(null)
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
  const clearPickRef = React.useRef(() => {})
  annotateRef.current = annotate
  pickRef.current = pick
  pinsRef.current = pins
  commentRef.current = comment
  editingRef.current = editing
  shotMetaRef.current = shotMeta

  // The host owns light/dark; the pane follows it through nano-ui's ThemeScope.
  // The service and its event are stable for the life of the page, so the
  // scope is created once on the workspace element.
  React.useEffect(() => {
    const element = workspaceRef.current
    if (element === null) return undefined
    const scope = createThemeScope({ theme, element, subscribe: onThemeChange })
    return () => scope.dispose()
  }, [])

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

  // The vertical tab list mirrors the DNLS driver's history projection:
  // one row per visited address, current page marked. No upstream KV patch.
  // Refreshing on open keeps the list honest after external /open calls.
  React.useEffect(() => {
    if (!navOpen) return
    let alive = true
    fetch(`${BROWSE_HISTORY}?limit=120`).then((r) => r.json())
      .then((data) => {
        if (!alive) return
        // Normalize across stores: KV rows are raw {url,at} visits, plugin
        // rows carry id/count. Tabs collapse to one per address, newest first.
        const byUrl = new Map()
        for (const row of Array.isArray(data?.entries) ? data.entries : []) {
          if (!row?.url) continue
          const prev = byUrl.get(row.url)
          if (prev) prev.count += row.count || 1
          else byUrl.set(row.url, { url: row.url, count: row.count || 1 })
        }
        setNavTabs([...byUrl.values()])
      })
      .catch(() => { if (alive) setNavTabs([]) })
    return () => { alive = false }
  }, [navOpen])

  const delNavTab = (url) => {
    fetch(`${BROWSE_HISTORY}?url=${encodeURIComponent(url)}`, { method: 'DELETE' }).catch(() => {})
    setNavTabs((current) => current.filter((row) => row.url !== url))
  }

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
        event.preventDefault()
        if (dragRef.current) { endDrag(); return }
        // First Esc drops the CSS selection. Design mode itself stays on,
        // so the next click can pick again. A second Esc leaves annotate.
        if (pickRef.current) { clearPickRef.current(); return }
        if (annotateRef.current) { setAnnotate(false); return }
        setNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  React.useEffect(() => {
    if (!beat) { setBeatSec(0); return undefined }
    const started = Date.now()
    let ticks = 0
    const timer = window.setInterval(() => {
      ticks += 1
      setBeatSec(Math.max(1, Math.floor((Date.now() - started) / 1000)))
      // 等 /open 回复的窗口里顺便盯 navigation.outcome：心跳只能报
      // 「本地等了 N 秒」，是否还在导航是引擎才答得出的问题。
      if (ticks % 2 === 0) refreshStatus().catch(() => {})
    }, 1000)
    return () => window.clearInterval(timer)
  }, [beat])

  // 引擎自己说还在导航（/open 已超时返回，但 navigation.outcome 仍是
  // in-flight）：保持低频轮询，让「引擎仍在执行」标记能如实消失。
  React.useEffect(() => {
    if (!engineNavigating) return undefined
    const timer = window.setInterval(() => { refreshStatus().catch(() => {}) }, 3000)
    return () => window.clearInterval(timer)
  }, [engineNavigating])

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

  // DOM 预览是静态快照，但页面自己会异步变化（SPA 挂载、agent edit、延时
  // 脚本）。打开页面且启用原生 HTML 时每 3s 拉一次 /dom：只有 domSeq /
  // capturedAt / generation（旧宿主回退 srcdoc 内容）变化才重写 iframe，
  // 同一版本不重写能保住滚动位置和选中态。连续失败 3 次后停等下次导航，
  // 避免引擎死了还一直打。
  React.useEffect(() => {
    if (!nativeHtml || !shot) return undefined
    let alive = true
    let fails = 0
    const poll = () => {
      loadDom().then((ok) => { fails = ok ? 0 : fails + 1 }).catch(() => { fails += 1 })
    }
    const timer = window.setInterval(() => { if (alive && fails < 3) poll() }, 3000)
    return () => { alive = false; clearInterval(timer) }
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
      // ⌘E,1 is reserved for DNN's wake/close — kitesurf only owns ⌘E,2.
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
    const phase = engine.phase
    if (phase && phase !== 'running' && shot) { setShot(null); setPick(null); setPins([]); setShotMeta(null) }
  }, [engine.phase])

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

  // Engine/recoverable errors earn a repair shortcut on the toast; input and
  // ref misses are user-error and stay plain. POST /recover replays the last
  // opened url, then a fresh shot replaces the failed frame.
  const RECOVERABLE = /^kitesurf\.(shot|engine|elements|dom|navigate|pick|wait|ref)\.|^sandbox\.cdp\./

  /**
   * Every disruptive lifecycle action goes through this gate: the dialog
   * names the selected sandbox and only its confirm runs the restart — no
   * blank repair POST, no implicit restart.
   */
  function confirmRestart(work) {
    const workspaceEl = workspaceRef.current
    if (dialogOpenRef.current || workspaceEl === null) { showToast(copy.prepareNotReady); return }
    dialogOpenRef.current = true
    const finish = () => { dialogOpenRef.current = false }
    const name = sandboxId ?? ''
    let dialog = null
    dialog = openNanoDialog({
      copy: { cancel: copy.cancel, confirm: copy.restartSandbox, close: copy.close },
      title: copy.restartSandboxTitle,
      width: 420,
      container: workspaceEl,
      confirmLabel: copy.restartSandbox,
      onCancel: finish,
      onConfirm: () => {
        finish()
        dialog?.close()
        work()
      },
      children: h('p', { 'data-nks-restart-confirm': '1' }, fill(copy.restartSandboxBody, { name })),
    })
  }

  function repairNow() {
    setToastFix(false)
    confirmRestart(() => run(async () => {
      await runLifecycle('restart')
      await refreshStatus()
      await reloadShot(0, { keepPick: true }).catch(() => {})
      setToast(copy.prepareDone)
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => { setToast(null); setToastFix(false) }, 3000)
    }))
  }

  function showError(cause) {
    const errorId = cause?.errorId || 'kitesurf.unknown'
    const message = cause instanceof Error ? cause.message : String(cause)
    setToast(`${errorId} ${message}`)
    setToastFix(RECOVERABLE.test(errorId))
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { setToast(null); setToastFix(false) }, 4000)
    refreshStatus() // a failure may have changed the engine's truth
  }

  function showToast(text) {
    setToast(text)
    setToastFix(false)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { setToast(null); setToastFix(false) }, 2000)
  }

  async function run(work, opts) {
    // Every pane action becomes a perf span so /perf-review/host can show what
    // the pane actually spends time on.
    if (perf?.span) return perf.span('pane-op', () => runInner(work, opts))
    return runInner(work, opts)
  }

  async function runInner(work, opts = {}) {
    // Diagnostic counter: proves whether an action reached the pane at all.
    window.__dnkRuns = (window.__dnkRuns || 0) + 1
    // One entry guard for EVERY action (address Enter, refresh, start engine,
    // history, settings apply): a second submit while the first /open is in
    // flight used to fire a duplicate navigate and clear busy early.
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    if (opts.beat) setBeat(true)
    try {
      await work()
    } catch (cause) {
      // A deadline is not proof that navigation stopped. Only an explicit
      // user retry may issue another Page.navigate.
      // 导航类操作失败：画面还停在上一帧——它是 last-good，不是当前页。
      // 打 stale 标记，banner 会把「这是上次成功画面」告诉用户。
      if (opts.nav) setStaleNav(true)
      if (opts.dialog) showOpenError(cause, opts.url)
      else showError(cause)
    } finally {
      busyRef.current = false
      setBusy(false)
      setBeat(false)
    }
  }

  /** Navigation failure is a dialog, not a toast that vanishes while the
   *  page is still blank. Retry replays the same url. */
  function showOpenError(cause, url) {
    const errorId = cause?.errorId || 'kitesurf.unknown'
    const message = cause instanceof Error ? cause.message : String(cause)
    refreshStatus()
    const workspaceEl = workspaceRef.current
    if (dialogOpenRef.current || workspaceEl === null) {
      showError(cause)
      return
    }
    dialogOpenRef.current = true
    let dialog = null
    const finish = () => { dialogOpenRef.current = false }
    // A refused connection to a loopback host is the single most common
    // "nothing opens" report, and the raw `net::ERR_CONNECTION_REFUSED` in
    // this dialog never said why: the URL is resolved INSIDE the container, so
    // `localhost` is the container, not the machine the dev server runs on.
    // Say that here instead of letting the message imply the pane is broken.
    const loopback = (() => {
      try {
        const host = new URL(url || '').hostname.toLowerCase()
        return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
          || host === '::1' || host === '[::1]' || host.endsWith('.localhost')
      } catch { return false }
    })()
    const canRepair = RECOVERABLE.test(errorId)
    dialog = openNanoDialog({
      copy: { cancel: copy.close, confirm: url ? copy.retry : copy.close, close: copy.close },
      title: copy.openFailed,
      description: errorId,
      width: 420,
      container: workspaceEl,
      confirmLabel: url ? copy.retry : copy.close,
      onCancel: finish,
      onConfirm: () => {
        finish()
        dialog?.close()
        if (url) openPage(url)
      },
      children: h('div', { 'data-nks-open-error': '1' },
        h('p', { className: 'nks-open-error' }, message),
        loopback ? h('p', { className: 'nks-open-error', 'data-nks-open-loopback': '1' }, copy.openErrorLoopback) : null,
        url ? h('p', { className: 'nks-open-error nks-open-url' }, url) : null,
        cause?.detail?.engineLog
          ? h('pre', { className: 'nks-open-log', 'data-nks-open-log': '1' }, cause.detail.engineLog)
          : null,
        // The toast has had a repair shortcut all along; the dialog did not,
        // so a navigation failure was a dead end with only "retry". The engine
        // can die mid-navigate (workerd terminates the page script), and then
        // every retry fails the same way until something restarts it.
        canRepair ? h('button', {
          type: 'button',
          className: 'nks-open-repair',
          'data-nks-open-repair': '1',
          onClick: () => {
            finish()
            dialog?.close()
            repairNow()
          },
        }, copy.openRepairRetry) : null),
    })
  }

  function openPage(url) {
    return run(() => navigate(url), { beat: true, dialog: true, url, nav: true })
  }

  function remember(url) {
    setPageUrl(url)
    setHistory((current) => [url, ...current.filter((item) => item !== url)].slice(0, 8))
  }

  /** The host waits for Page.navigate. Do not impose a second, shorter
   * "confirmation" timer that leaves captures running and restarts the page. */
  async function navigate(url) {
    const shotPayload = await perf.span('navigate', () => captureNavigation(post, {
      openPath: OPEN, shotPath: SHOT, url, fit: frameSize(),
    }))
    setShot(shotPayload.data)
    setShotMime(shotPayload.mimeType || 'image/webp')
    setShotMeta({ url: shotPayload.url || '', scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || '', viewport: shotPayload.viewport?.width ?? null, at: Date.now() })
    // 新导航真的落了帧：上次失败的 stale 标记清掉，画面重新代表当前页。
    setStaleNav(false)
    await loadDom()
    setPick(null)
    remember(shotPayload.url)
  }

  /** Pane content size in integer CSS px — the engine viewport we ask for. */
  function frameSize() {
    const element = frameRef.current
    if (!element) return null
    const rect = element.getBoundingClientRect()
    const width = Math.round(rect.width)
    if (width < 320) return null
    // Hint, pin strip and the style row are overlays on this box. Counting
    // their height used to change the engine viewport the moment they appeared,
    // which reflowed the page. The frame's own box is the only size.
    const height = Math.max(240, Math.min(2160, Math.round(rect.height)))
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
        // 版本签名优先用后端给的 domSeq/capturedAt/generation；旧宿主一个
        // 都没有时退化为 srcdoc 内容+URL，免得 3s 轮询每轮都重写 iframe
        // 把滚动位置打飞。
        const sig = (data.domSeq ?? data.capturedAt ?? data.generation) != null
          ? `v:${data.domSeq ?? ''}:${data.capturedAt ?? ''}:${data.generation ?? ''}:${data.url ?? ''}`
          : `s:${data.srcdoc}:${data.url ?? ''}`
        // 比对只走 ref：domDoc 是渲染闭包里的旧值，3s 轮询拿不到最新。
        if (sig && sig === domVersionRef.current) return true
        domVersionRef.current = sig
        setDomDoc({
          srcdoc: data.srcdoc,
          url: data.url,
          at: Date.now(),
          capturedAt: data.capturedAt ?? null,
          domSeq: data.domSeq ?? null,
          generation: data.generation ?? null,
        })
        if (data.url && data.url !== 'about:blank') setPageUrl(data.url)
        return true
      }
    } catch { /* fall back to the screenshot */ }
    if (!options.keep) { setDomDoc(null); domVersionRef.current = '' }
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
    // 一帧成功的新截图同样证明画面回到「当前页」，stale 标记可以撤了。
    setStaleNav(false)
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
    await openPage(draftUrl)
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
    // Throttled to one in-flight pick; previews never replace the current pick.
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

  /** One toggle for every activation path (mouse press, keyboard, script). */
  function toggleAnnotate() {
    setAnnotate((value) => {
      if (value) { setHover(null); endDrag() }
      return !value
    })
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
    // 滚动重截属于「刷新画面」：失败也要标 stale，不把旧帧当成当前页。
    run(() => reloadShot(delta), { nav: true })
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
  function clearPick() {
    setPick(null)
    setEditing(false)
    setComposing(false)
    setComment('')
    setHover(null)
  }
  clearPickRef.current = clearPick

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
   * The full note stays in this panel. There is no context route.
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
      const refId = null
      localNotes.push({ text: note, packet: element, label })
      insertComposerNote(note)
      setComment('')
      setComposing(false)
      setPick(null)
      showToast(refId ? fill(copy.injectedCharsRef, { n: note.length, id: refId }) : fill(copy.injectedChars, { n: note.length }))
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

  /** The error-state button is an explicit confirmed restart, never a silent repair. */
  function oneClickPrepare() {
    confirmRestart(() => run(async () => {
      try {
        await runLifecycle('restart')
        await refreshStatus()
        await reloadShot(0, { keepPick: true })
      } catch (cause) {
        showError(cause)
      }
    }))
  }

  /**
   * dnls.control/1 lifecycle vocabulary is start/stop/restart/recreate —
   * the pane maps the engine's suspend/resume wording onto it and never
   * issues prepare/init/recover here. A 200 only means the operation was
   * accepted; the exact operationId decides the outcome.
   */
  async function runLifecycle(action) {
    const managed = action === 'suspend' ? 'stop' : action === 'resume' ? 'start' : action
    const data = await post(LIFECYCLE, { action: managed, requestId: crypto.randomUUID() })
    const operationId = data?.operationId
    // A lifecycle answer without an operation receipt is a failure, not success.
    if (!operationId) throw new Error('missing operation receipt')
    return awaitOperation(operationId)
  }

  async function awaitOperation(operationId) {
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      const res = await fetch(`/nano-local-sandbox/operations?operationId=${encodeURIComponent(operationId)}`)
      if (!res.ok) throw new Error(`operation read failed (${res.status})`)
      const last = await res.json().catch(() => null)
      if (!last || last.operationId !== operationId) throw new Error('operation read mismatch')
      const state = last.state
      if (state && state !== 'accepted' && state !== 'running') {
        // Only a confirmed succeeded may re-shoot; everything else is honest failure.
        if (state !== 'succeeded') throw new Error(`operation ${operationId} ${state}`)
        return last
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500))
    }
    throw new Error(`operation ${operationId} did not settle`)
  }

  function onStartEngine() {
    // The status call decides start vs resume; the pane should not guess phase.
    run(async () => {
      const fresh = await refreshStatus()
      const phase = engineEndpoint(fresh).phase
      if (phase === 'running') return
      // dnls.control/1: resume maps to start, suspend would map to stop.
      await runLifecycle(phase === 'suspended' ? 'resume' : 'start')
      await reloadShot()
    })
  }

  async function onRefresh() {
    if (!pageUrl) return
    await openPage(pageUrl)
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

  // HITL poll: the bridge control state is a small JSON on the loopback —
  // cheap enough to ride the visible-tab cadence (1.5s) and back off to 12s
  // while the pane is backgrounded. A new lastAction stamps a toast so the
  // human sees "agent_browser_click…" flashes the way ego shows "Clicking
  // element". Gate on "engine reported a page" not on "pane already shot":
  // an agent can hold the writer before the human ever sees a frame, and the
  // bar must appear then too.
  const engineHasPage = hasPage || engine.phase === 'running' || !!engine.httpBase
  React.useEffect(() => {
    if (!engineHasPage) { setControl(null); return undefined }
    let alive = true
    const load = async () => {
      try {
        const data = await fetch(CONTROL).then((r) => r.json())
        if (!alive) return
        const c = data?.control ?? null
        setControl(c)
        const stamp = c?.lastAction ? `${c.lastAction.at}:${c.lastAction.tool}` : ''
        if (stamp && stamp !== lastActionStamp.current) {
          lastActionStamp.current = stamp
          setActionToast({ tool: c.lastAction.tool, ok: c.lastAction.ok })
          clearTimeout(actionToastTimer.current)
          actionToastTimer.current = setTimeout(() => setActionToast(null), 2600)
        }
      } catch { /* bridge unreachable — hide the badge quietly */ }
    }
    load()
    let timer = window.setInterval(load, document.visibilityState === 'hidden' ? 12000 : 1500)
    const onVis = () => { clearInterval(timer); timer = window.setInterval(load, document.visibilityState === 'hidden' ? 12000 : 1500); if (document.visibilityState !== 'hidden') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVis); clearTimeout(actionToastTimer.current) }
  }, [engineHasPage])

  const controlOp = React.useCallback(async (action) => {
    try {
      const data = await fetch(CONTROL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, owner: 'kitesurf-pane' }) }).then((r) => r.json())
      if (data?.control) setControl(data.control)
      else setControl(null)
    } catch { setControl(null) }
  }, [])
  const anchor = pick?.anchor
  const pickAnchor = (overlays.find((o) => o.kind === 'pick' || o.kind === 'ellipse'))
    || (activeFrame && anchor ? { left: activeFrame.left + anchor.x * activeFrame.scale, top: activeFrame.top + anchor.y * activeFrame.scale, width: 0, height: 0 } : null)
    || (activeFrame ? { left: activeFrame.left + 16, top: activeFrame.top + 16, width: 0, height: 0 } : null)

  // Back/forward use the catalog's own chevrons — the primitives set ships
  // both directions, so browser chrome no longer draws 16px strokes inline.
  const glyph = (name) => {
    const Icon = {
      back: primitives.IconChevronLeftOutlineRegular,
      forward: primitives.IconChevronRightOutlineRegular,
      history: primitives.IconClockOutlineRegular,
      refresh: primitives.IconRefreshOutlineRegular,
      go: primitives.IconLinkOutlineRegular,
      annotate: primitives.IconEditOutlineRegular,
      settings: primitives.IconSettingsOutlineRegular,
      send: primitives.IconRightUpOutlineRegular,
      undo: primitives.IconCloseOutlineRegular,
      exit: primitives.IconCloseOutlineRegular,
      clear: primitives.IconTrashOutlineRegular,
      edit: primitives.IconEditOutlineRegular || primitives.IconRightUpOutlineRegular,
      copy: primitives.IconCopyOutlineRegular || primitives.IconEditOutlineRegular,
      panel: primitives.IconPanelLeftOutlineRegular || primitives.IconEditOutlineRegular,
      globe: primitives.IconGlobeOutlineRegular || primitives.IconLinkOutlineRegular,
    }[name]
    // The icon component does not forward a style prop, so the expand/
    // collapse direction (native artwork: ExpandButton mirrors the glyph
    // for the expand affordance; the collapse seat keeps it unmirrored)
    // goes through a wrapper span — the primitive Icon is the inner
    // element. Closed → mirrored (reveal affordance), open → unmirrored
    // (panel-at-left = the rail currently shown).
    // Native _iconButton svg is 15×15 inside a 28×28 button (6px inset);
    // the panel toggle keeps the same icon geometry.
    return h('span',
      { className: 'nks-tool-glyph', style: !navOpen && name === 'panel' ? { display: 'inline-flex', transform: 'scaleX(-1)' } : { display: 'inline-flex' } },
      h(Icon, { width: 15, height: 15, 'aria-hidden': true }))
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
    const [probeMisses, setProbeMisses] = React.useState(0)
    const [diag, setDiag] = React.useState(null)
    const copyRawDiag = React.useRef(false)
    const [busyLocal, setBusyLocal] = React.useState(false)
    const [note, setNote] = React.useState('')
    const logsOpenRef = React.useRef(false)
    React.useEffect(() => {
      let alive = true
      let seen = null
      const load = () => fetch(PORTS).then((r) => r.json()).then((data) => {
        if (!alive || !data) return
        setProbeMisses(0)
        const sig = `${data.v ?? ''}:${data.epoch ?? ''}:${data.ready ?? ''}`
        if (sig === seen) return
        seen = sig
        setSnap(data)
      }).catch(() => { if (alive) setProbeMisses((n) => n + 1) })
      load()
      const period = () => (document.visibilityState === 'hidden' ? 12000 : 1500)
      let timer = window.setInterval(load, period())
      const onVis = () => { clearInterval(timer); timer = window.setInterval(load, period()); if (document.visibilityState !== 'hidden') load() }
      document.addEventListener('visibilitychange', onVis)
      return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVis) }
    }, [])
    function prepare() {
      // The one-click env button is a confirmed restart of the selected
      // sandbox — the old implicit POST /recover repair is gone.
      confirmRestart(() => {
        setBusyLocal(true); setNote(copy.preparingEnv)
        ;(async () => {
          try {
            await runLifecycle('restart')
            const ports = await fetch(PORTS).then((r) => r.json()).catch(() => null)
            setSnap(ports)
            setNote(copy.prepareDone)
            await refreshStatus()
            await reloadShot(0, { keepPick: true }).catch(() => {})
          } catch (cause) {
            setNote(`${copy.prepareFailed}: ${cause?.message || cause}`)
          } finally {
            setBusyLocal(false)
          }
        })()
      })
    }
    /** Engine output lives only inside the container. Without it "engine
     *  down" is a verdict with no evidence. */
    async function showLogs() {
      const workspaceEl = workspaceRef.current
      // Its own guard: the log is opened FROM the settings dialog, so sharing
      // dialogOpenRef would refuse every time.
      if (workspaceEl === null || logsOpenRef.current) return
      let text = copy.logsLoading
      try {
        const data = await fetch(`${LOGS}?tail=300`).then((r) => r.json())
        text = data.ok ? (data.text || copy.logsEmpty) : `${data.errorId || 'kitesurf.engine.connect'} ${data.error || ''}`
      } catch (cause) {
        text = String(cause?.message || cause)
      }
      if (workspaceEl !== workspaceRef.current) return
      logsOpenRef.current = true
      let dialog = null
      const close = () => { logsOpenRef.current = false }
      dialog = openNanoDialog({
        copy: { cancel: copy.close, confirm: copy.close, close: copy.close },
        title: copy.logsTitle,
        description: copy.logsDesc,
        width: 720,
        maxHeight: 560,
        container: workspaceEl,
        confirmLabel: copy.close,
        onCancel: close,
        onConfirm: () => { close(); dialog?.close() },
        children: h('pre', { className: 'nks-logs', 'data-nks-logs': '1' }, text),
      })
    }

    async function copyDiagnostics() {
      try {
        const data = await fetch(DIAGNOSTICS).then((r) => r.json())
        // Humans get the short report the host already renders; the full JSON
        // stays available to agents via the same route. Shift-click copies the
        // raw payload for a bug report that needs every field.
        setDiag(data)
        const text = copyRawDiag.current ? JSON.stringify(data, null, 2) : (data.text || JSON.stringify(data, null, 2))
        await navigator.clipboard.writeText(text)
        showToast(copy.diagCopied)
      } catch (cause) { showError(cause) }
    }
    const engineBase = snap?.effective?.httpBase || '—'
    const container = snap?.container?.state || '—'
    const portRow = snap?.ports?.engine
      ? `${snap.ports.engine.port} · ${snap.ports.engine.heldBy === 'this-container' ? copy.portHeld : copy.portFree}`
      : '—'
    // The badge reads planes and ready. It does not recompute ready from rows.
    // A host older than the observation contract has no `v` at all. That is
    // "less detail", not "wrong": only a version we do not understand is a
    // mismatch, and even then the pane keeps working on the fields it has.
    const contractMismatch = snap != null && Number.isFinite(snap.v) && snap.v !== 1
    const legacyHost = snap != null && !Number.isFinite(snap.v)
    const rows = planeRows(snap, copy)
    // snap===null 只是「还没拿到第一次观测」，不是环境挂了：亮中性灰点
    // 「检测中…」，等快照回来再判定。只有拿到快照且明确失败才是 envBad，
    // 否则加载中的设置页会闪现一片红色「异常 + 全 —」。
    // snap===null is "first probe hasn't answered yet" for the first couple of
    // ticks only — a port that keeps failing is unreachable, not still probing.
    const probing = snap == null && probeMisses < 3
    const healthy = !probing && !contractMismatch && snap?.ready === true
    return h('div', { className: 'nks-env', 'data-nks-env': '1' },
      h('div', { className: 'nks-env-title' }, copy.envTitle,
        h('span', { className: healthy ? 'nks-env-ok' : probing ? 'nks-env-wait' : 'nks-env-bad', title: legacyHost ? copy.legacyHostTitle : undefined },
          probing ? `○ ${copy.envProbing}` : contractMismatch ? copy.contractNewer : healthy ? `● ${copy.envOk}` : `● ${copy.envBad}`),
        legacyHost ? h('span', { className: 'nks-env-legacy', 'data-nks-legacy': '1' }, copy.legacyHost) : null),
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envPlugin), h('span', null, snap?.buildId || copy.envUnknown)),
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envEngine), h('span', null, engineBase)),
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envContainer), h('span', null, container)),
      snap?.containerName ? h('div', { className: 'nks-env-row' }, h('b', null, copy.envInstance), h('span', null, snap.containerName)) : null,
      h('div', { className: 'nks-env-row' }, h('b', null, copy.envPorts), h('span', null, portRow)),
      // Per-plane health, so "OK" can no longer mean "container up but the
      // pane silently fell back to screenshots".
      rows.length ? h('div', { className: 'nks-env-checks', 'data-nks-checks': String(rows.length) },
        rows.map((row) => h('div', { key: row.label, className: 'nks-env-check', 'data-ok': row.skipped ? 'skip' : row.ok ? 'true' : 'false' },
          h('span', { className: 'nks-env-check-dot' }, row.skipped ? '○' : row.ok ? '✓' : '✗'),
          h('b', null, row.label),
          h('span', { className: 'nks-env-check-detail' }, row.detail || '—')))) : null,
      h('div', { className: 'nks-env-actions' },
        h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-prepare': '1', disabled: busyLocal, onClick: prepare }, busyLocal ? copy.preparingEnv : copy.restartSandbox),
        h('button', {
          type: 'button',
          className: 'nks-start-btn',
          'data-nks-copy-diag': '1',
          title: copy.copyDiagHint,
          onClick: (event) => { copyRawDiag.current = event.shiftKey === true; copyDiagnostics() },
        }, copy.copyDiag),
        h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-logs-open': '1', onClick: showLogs }, copy.logsButton)),
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
      if (!annotateRef.current) return
      e.preventDefault(); e.stopPropagation()
      const el = doc.elementFromPoint(e.clientX, e.clientY)
      if (!el) return
      clearHover()
      const packet = packetFromDom(el, doc, e.clientX, e.clientY)
      setPick({ elements: [packet], anchor: { x: packet.box.x + packet.box.width / 2, y: packet.box.y + packet.box.height } })
      setEditing(false)
    }, true)
    doc.addEventListener('mouseleave', clearHover, true)
    // Focus stays in the iframe after a pick, so the parent window never
    // hears Escape. Close the selection from in here.
    doc.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      if (!pickRef.current) return
      e.preventDefault()
      e.stopPropagation()
      clearPickRef.current()
    }, true)
  }

  /** Settings shell: environment health and browser simulation. Browsing
   *  history lives in the toolbar entry, not behind a settings tab. */
  function SettingsTabs({ env, simulation }) {
    return h(NanoTabs, {
      label: copy.settingsTitle,
      items: [
        { value: 'env', label: copy.tabEnv, content: env },
        { value: 'simulation', label: copy.tabBrowse, content: simulation },
      ],
    })
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
          h('b', null, copy.historyTitle),
          h('span', { className: 'nks-modal-sub' }, fill(copy.historyCount, { n: rows.length })),
          h('button', { type: 'button', className: 'nks-modal-x', onClick: onClose, 'aria-label': copy.close }, '×')),
        h('div', { className: 'nks-modal-bar' },
          h('input', { 'data-nks-history-q': '1', placeholder: copy.historySearch, value: q, onChange: async (e) => { setQ(e.target.value); await load(e.target.value) } }),
          h('button', { type: 'button', 'data-nks-history-clear': '1', disabled: busy || !rows.length, onClick: clear }, copy.historyClear)),
        h('div', { className: 'nks-modal-body' },
          rows.length ? rows.map((row) => h('div', { className: 'nks-hist-row', key: row.id, 'data-nks-history-row': row.id },
            h('button', { type: 'button', className: 'nks-hist-open', onClick: () => { setDraftUrl(row.url); setHistoryOpen(false); openPage(row.url) } },
              h('span', { className: 'nks-hist-url' }, row.url),
              h('span', { className: 'nks-hist-meta' }, `${String(row.at).slice(0, 16).replace('T', ' ')}${row.count > 1 ? fill(copy.historyTimes, { n: row.count }) : ''}`)),
            h('button', { type: 'button', className: 'nks-hist-del', 'data-nks-history-del': row.id, onClick: () => del(row.id), 'aria-label': copy.historyDelete }, '×')))
            : h('div', { className: 'nks-modal-empty' }, copy.historyEmpty))) )
  }


  function openSettings() {
    if (dialogOpenRef.current) return
    // The dialog is a window overlay inside the pane itself, not a viewport
    // rectangle: the workspace element is the containing block.
    const workspaceEl = workspaceRef.current
    if (workspaceEl === null) return
    dialogOpenRef.current = true
    let close = () => {}
    let current = { userAgent: '', viewportWidth: '', viewportHeight: '', locale: '', geolocation: null, colorScheme: 'light', cookies: '' }
    const dialog = openNanoDialog({
      copy: { cancel: copy.cancel, confirm: copy.save, close: copy.close },
      title: copy.settingsTitle,
      description: copy.settingsDesc,
      width: 420,
      // Fixed height: the tab strip changes panels, never the card size.
      fixedHeight: 560,
      container: workspaceEl,
      // openNanoDialog already closes itself after onCancel — closing here
      // again would double root.unmount()/host.remove() (S3-3).
      onCancel: () => { dialogOpenRef.current = false },
      onConfirm: () => save(),
      children: h(SettingsTabs, {
        env: h('div', { className: 'nks-settings-stack' }, h(EnvPanel, null)),
        simulation: h('form', {
          className: 'nks-settings-body nks-simulation-body',
          onSubmit: (event) => { event.preventDefault(); save() },
        },
          h('label', { htmlFor: 'nks-ua' }, copy.uaLabel),
          h('input', { id: 'nks-ua', className: 'nks-address', autoFocus: true, placeholder: copy.uaPlaceholder }),
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
          },
            [['default', copy.viewportDefault], ['1280', copy.viewportDesktop], ['768', copy.viewportTablet], ['390', copy.viewportPhone]]
              .map(([value, label]) => h('button', {
                key: value, type: 'button', role: 'radio',
                'aria-checked': value === 'default' ? 'true' : 'false',
                tabIndex: value === 'default' ? 0 : -1,
                'data-choice': value, className: 'nks-choice',
                onClick: (event) => selectRadio(event.currentTarget.parentElement, value),
              }, label))),
          h('span', { className: 'nks-settings-hint', 'data-nks-vp-unsupported': '1' }, copy.viewportSupport),
          h('label', { htmlFor: 'nks-locale' }, copy.localeLabel),
          h('input', { id: 'nks-locale', className: 'nks-address', placeholder: copy.localePlaceholder, spellCheck: false, autoComplete: 'off' }),
          h('label', null, copy.geoLabel),
          h('div', { className: 'nks-settings-pair' },
            h('input', { id: 'nks-geo-lat', className: 'nks-address', type: 'number', step: 'any', placeholder: copy.geoLat, 'aria-label': copy.geoLat }),
            h('input', { id: 'nks-geo-lng', className: 'nks-address', type: 'number', step: 'any', placeholder: copy.geoLng, 'aria-label': copy.geoLng })),
          h('span', { className: 'nks-settings-hint' }, copy.geoHint),
          h('span', { id: 'nks-color-label' }, copy.colorSchemeLabel),
          h('div', {
            id: 'nks-color',
            className: 'nks-choices',
            role: 'radiogroup',
            'aria-labelledby': 'nks-color-label',
            'data-value': 'light',
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
          },
            [['light', copy.colorSchemeLight], ['dark', copy.colorSchemeDark]]
              .map(([value, label]) => h('button', {
                key: value, type: 'button', role: 'radio',
                'aria-checked': value === 'light' ? 'true' : 'false',
                tabIndex: value === 'light' ? 0 : -1,
                'data-choice': value, className: 'nks-choice',
                onClick: (event) => selectRadio(event.currentTarget.parentElement, value),
              }, label))),
          h('label', { htmlFor: 'nks-cookies' }, copy.cookiesLabel),
          h('textarea', { id: 'nks-cookies', className: 'nks-address nks-cookie-text', rows: 4, placeholder: copy.cookiesPlaceholder, spellCheck: false }),
          h('span', { className: 'nks-settings-hint' }, copy.cookiesHint),
          h('button', { type: 'submit', style: { display: 'none' }, 'aria-hidden': 'true', tabIndex: -1 })),
      })
    })
    close = () => { dialogOpenRef.current = false; dialog.close() }

    function save() {
      const nextAgent = document.getElementById('nks-ua')?.value ?? ''
      const choice = document.getElementById('nks-viewport')?.dataset.value ?? 'default'
      const nextLocale = (document.getElementById('nks-locale')?.value ?? '').trim()
      const latText = (document.getElementById('nks-geo-lat')?.value ?? '').trim()
      const lngText = (document.getElementById('nks-geo-lng')?.value ?? '').trim()
      const nextColor = document.getElementById('nks-color')?.dataset.value ?? 'light'
      const nextCookies = document.getElementById('nks-cookies')?.value ?? ''
      run(async () => {
        let nextGeo = null
        if (latText || lngText) {
          const latitude = Number(latText)
          const longitude = Number(lngText)
          if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw Object.assign(new Error(copy.geoInvalid), { status: 400, errorId: 'kitesurf.body.json' })
          }
          nextGeo = { latitude, longitude }
        }
        const settingsPatch = {}
        if (nextAgent !== current.userAgent) settingsPatch.userAgent = nextAgent
        const nextWidth = choice === 'default' ? '' : choice
        const viewportHeights = { 1280: 900, 768: 900, 390: 844 }
        if (nextWidth !== current.viewportWidth) {
          settingsPatch.viewport = choice === 'default' ? null : { width: Number(choice), height: viewportHeights[choice] || 900 }
        }
        if (nextLocale !== current.locale) settingsPatch.locale = nextLocale || null
        if (JSON.stringify(nextGeo) !== JSON.stringify(current.geolocation)) settingsPatch.geolocation = nextGeo
        if (nextColor !== current.colorScheme) settingsPatch.colorScheme = nextColor
        if (nextCookies !== current.cookies) settingsPatch.cookies = nextCookies || null
        if (Object.keys(settingsPatch).length) await post(SETTINGS, settingsPatch)
        close()
        // 「已保存」必须以引擎 status 回读为准：POST 200 只说明请求被收下，
        // 不代表字段真的落了库。逐项核对刚提交的 patch——只报「没生效的」，
        // 全对上了才说已保存。
        const fresh = await refreshStatus().catch(() => null)
        const unconfirmed = []
        for (const [key, want] of Object.entries(settingsPatch)) {
          const got = fresh?.[key]
          const same = key === 'viewport'
            ? ((want == null) === (got == null) && (want == null || (got?.width === want.width && got?.height === want.height)))
            : key === 'geolocation'
              ? ((want == null) === (got == null) && (want == null || (got?.latitude === want.latitude && got?.longitude === want.longitude)))
              : String(want ?? '') === String(got ?? '')
          if (!same) unconfirmed.push(key)
        }
        showToast(unconfirmed.length ? `${copy.savedUnconfirmed} (${unconfirmed.join(', ')})` : copy.saved)
      })
    }

    // Seed the dialog from live status so saving never resets unseen fields.
    refreshStatus().then((fresh) => {
      current = {
        userAgent: fresh?.userAgent ?? '',
        viewportWidth: fresh?.viewport?.width ? String(fresh.viewport.width) : '',
        viewportHeight: fresh?.viewport?.height ? String(fresh.viewport.height) : '',
        locale: fresh?.locale ?? '',
        geolocation: fresh?.geolocation ?? null,
        colorScheme: fresh?.colorScheme ?? 'light',
        cookies: fresh?.cookies ?? '',
      }
      const ua = document.getElementById('nks-ua')
      if (ua) ua.value = current.userAgent
      const localeInput = document.getElementById('nks-locale')
      if (localeInput) localeInput.value = current.locale
      const lat = document.getElementById('nks-geo-lat')
      const lng = document.getElementById('nks-geo-lng')
      if (lat) lat.value = current.geolocation?.latitude ?? ''
      if (lng) lng.value = current.geolocation?.longitude ?? ''
      const cookies = document.getElementById('nks-cookies')
      if (cookies) cookies.value = current.cookies
      const viewportChoice = ['1280', '768', '390'].includes(current.viewportWidth) ? current.viewportWidth : 'default'
      selectRadio(document.getElementById('nks-viewport'), viewportChoice)
      selectRadio(document.getElementById('nks-color'), current.colorScheme)
    })
  }

  return h('section', {
    ref: workspaceRef,
    className: 'nks-root',
    'data-nano-kitesurf': '1',
    'data-nks-workspace': '1',
  },
    h('form', { className: 'nks-toolbar', onSubmit: onSubmitAddress },
      h('button', {
        type: 'button',
        className: 'nks-tool nks-nav-toggle',
        'data-nks-nav-toggle': '1',
        'aria-pressed': navOpen ? 'true' : 'false',
        'aria-label': navOpen ? copy.navClose : copy.navOpen,
        title: navOpen ? copy.navCloseTitle : copy.navOpenTitle,
        onClick: () => setNavOpen((value) => !value),
      }, glyph('panel', navOpen), h('span', null, copy.navToggleLabel)),
      // Navigation trio shares the host strip's 8px pitch with the
      // trailing cluster — one rhythm across the whole toolbar.
      h('div', { className: 'nks-toolbar-nav' },
        h('button', { type: 'button', className: 'nks-tool', 'data-nks-back': '1', 'aria-label': copy.back, title: copy.back, disabled: busy || !hasPage, onClick: () => run(() => historyNav(-1), { beat: true, dialog: true, nav: true }) }, glyph('back')),
        h('button', { type: 'button', className: 'nks-tool', 'data-nks-forward': '1', 'aria-label': copy.forward, title: copy.forward, disabled: busy || !hasPage, onClick: () => run(() => historyNav(1), { beat: true, dialog: true, nav: true }) }, glyph('forward')),
        h('button', { type: 'button', className: 'nks-tool', 'data-nks-reload': '1', 'aria-label': copy.refresh, title: copy.refresh, disabled: busy, onClick: onRefresh }, glyph('refresh'))),
      h('span', { className: 'nks-address-box', 'data-address-short': copy.addressShort, 'data-dirty': draftUrl ? 'true' : 'false', 'data-loading': beat ? 'true' : 'false', 'aria-busy': beat ? 'true' : 'false' },
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
        beat ? h('span', {
          className: 'nks-address-beat',
          'data-nks-beat': '1',
          'data-nks-loading': '1',
          role: 'status',
          'aria-label': engineNavigating ? copy.navigating : copy.opening,
          // N 秒是本地计时，「导航中」是引擎上报的 navigation.outcome。
          title: engineNavigating ? `${copy.navigating} · ${copy.opening} ${beatSec}s` : `${copy.opening} ${beatSec}s`,
        },
          h('i', { className: 'nks-spin', 'aria-hidden': true }),
          engineNavigating || beatSec > 0 ? h('span', { 'data-nks-beat-sec': String(beatSec) }, engineNavigating ? `${copy.navigating}${beatSec > 0 ? ` ${beatSec}s` : ''}` : `${beatSec}s`) : null) : null,
        h('button', { type: 'submit', className: 'nks-tool nks-go', 'aria-label': copy.go, disabled: busy }, glyph('go'))),
      // Trailing cluster mirrors the host's three icon buttons (分栏 /
      // 全屏 / 侧栏): same 28×28 seats at an 8px pitch, so each of ours
      // lands under its native counterpart instead of walking 4px apart.
      h('div', { className: 'nks-toolbar-tail' },
        h('button', { type: 'button', className: 'nks-tool', 'data-nks-history-open': '1', 'aria-label': copy.history, title: copy.history, disabled: busy, onClick: openHistory }, glyph('history')),
        h('button', {
          type: 'button',
          className: 'nks-tool',
          'data-nks-annotate': '1',
          'aria-pressed': annotate ? 'true' : 'false',
          'aria-label': copy.annotate,
          title: copy.annotateTitle,
          onPointerDown: (event) => {
            event.preventDefault(); event.stopPropagation()
            toggleAnnotate()
          },
          // pointerdown covers a mouse press; click covers keyboard activation
          // (Space/Enter fire click only, with detail 0) and programmatic
          // callers. Guarding on detail keeps a real press from toggling twice.
          onClick: (event) => {
            if (event.detail === 0) toggleAnnotate()
          },
        }, glyph('annotate')),
        h('button', { type: 'button', className: 'nks-tool', 'data-nks-settings': '1', 'aria-label': copy.settings, title: copy.settings, onClick: openSettings }, glyph('settings')))),
    h('nav', {
      className: 'nks-nav',
      'data-nks-nav': '1',
      'data-nks-nav-state': navOpen ? 'open' : 'closed',
      'aria-label': copy.navTabs,
    },
      h('div', { className: 'nks-nav-head' },
        h('b', null, copy.navTabs)),
      h('div', { className: 'nks-nav-tabs', role: 'list', 'data-nks-nav-tabs': '1' },
        navTabs.length ? navTabs.map((row) => h('button', {
          type: 'button',
          key: row.url,
          className: 'nks-nav-tab',
          'data-nks-nav-tab': row.url,
          'data-current': row.url === pageUrl ? 'true' : 'false',
          title: row.url,
          onClick: () => { if (row.url !== pageUrl) openPage(row.url); setNavOpen(false) },
        },
          glyph('globe'),
          h('span', { className: 'nks-nav-tab-url' }, row.url.replace(/^https?:\/\//, '')),
          row.count > 1 ? h('span', { className: 'nks-nav-tab-count' }, `×${row.count}`) : null,
          h('span', {
            className: 'nks-nav-tab-x', role: 'button', 'aria-label': copy.navCloseTab, 'data-nks-nav-tab-del': row.url,
            onClick: (event) => { event.stopPropagation(); delNavTab(row.url) },
          }, '×')))
          : h('div', { className: 'nks-nav-empty' }, copy.navEmpty))),
    h('div', { className: 'nks-status', 'data-nks-status': '1' },
      h('button', { type: 'button', 'data-nks-native-toggle': '1', 'aria-pressed': nativeHtml ? 'true' : 'false', title: copy.nativeHtmlTitle, onClick: () => { setNativeHtml((v) => !v); if (!nativeHtml) loadDom().catch(() => {}) } }, 'HTML'),
      h('button', { type: 'button', 'data-nks-devtools-toggle': '1', 'aria-pressed': devtoolsOpen ? 'true' : 'false', title: copy.devtoolsToggleTitle, onClick: () => setDevtoolsOpen((v) => !v) }, copy.devtools),
      h('button', {
        type: 'button',
        'data-nks-vp': '1',
        className: 'nks-chip',
        title: copy.viewportTitle,
        onClick: (event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const apply = async (next) => {
            setVp(next); setVpCustom(false)
            try { await post(SETTINGS, { viewport: next }) } catch { /* local only */ }
          }
          openNanoMenu({
            anchor: { left: rect.left, top: rect.top, bottom: rect.bottom },
            // Rendered inside the pane (portal:false) so the list inherits the
            // workspace's scheme and stacking; no theme or z parameters.
            container: workspaceRef.current,
            direction: 'up',
            maxHeight: 6 * 28 + 8,
            items: [
              { id: 'fit', label: copy.viewportFit, run: () => apply(null) },
              { id: '1280', label: '1280×900', run: () => apply({ width: 1280, height: 900 }) },
              { id: '768', label: '768×900', run: () => apply({ width: 768, height: 900 }) },
              { id: '390', label: '390×844', run: () => apply({ width: 390, height: 844 }) },
              { id: 'custom', label: copy.viewportCustom, run: () => setVpCustom(true) },
            ],
          })
        },
      }, vp ? `${vp.width}×${vp.height}` : copy.viewportFit),
      vpCustom ? h('input', {
        'data-nks-vp-w': '1', type: 'number', placeholder: copy.viewportWidthPh, className: 'nks-vp-input',
        onKeyDown: async (e) => { if (e.key !== 'Enter') return; const w = Number(e.currentTarget.value); if (w >= 240) { const next = { width: w, height: vp?.height || 900 }; setVp(next); setVpCustom(false); try { await post(SETTINGS, { viewport: next }) } catch {} } },
      }) : null,
      vpCustom ? h('input', {
        'data-nks-vp-h': '1', type: 'number', placeholder: copy.viewportHeightPh, className: 'nks-vp-input',
        onKeyDown: async (e) => { if (e.key !== 'Enter') return; const h = Number(e.currentTarget.value); if (h >= 240) { const next = { width: vp?.width || 1280, height: h }; setVp(next); setVpCustom(false); try { await post(SETTINGS, { viewport: next }) } catch {} } },
      }) : null,
      // Three states, not two: an empty pane is neither native HTML nor a
      // screenshot. Calling it "IMG 截图回退" made a fresh pane look broken.
      h('span', {
        'data-nks-mode': nativeHtml && domDoc ? 'html' : hasPage ? 'img' : 'empty',
        style: { color: nativeHtml && domDoc ? 'var(--dsw-alias-state-success-primary)' : hasPage ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-label-tertiary)' },
      }, nativeHtml && domDoc ? copy.modeHtml : hasPage ? copy.modeShot : copy.modeEmpty),
      h('span', { style: { flex: 'auto' } })),

    h(HistoryDialog, { open: historyOpen, onClose: () => setHistoryOpen(false) }),
    h(DevTools, { copy, fetch, open: devtoolsOpen, onClose: () => setDevtoolsOpen(false) }),
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
      // Independent of pins/annotate: this one is about the RENDER SURFACE.
      // HTML mode is a static projection over real addresses — local http
      // subresources can be blocked as mixed content, so the notice is fixed
      // while the mode is on, not conditional on a host declaration.
      nativeHtml && domDoc ? h('div', {
        className: 'nks-hint nks-float-top',
        'data-nks-hint-unproxied': '1',
        role: 'status',
        onPointerDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
      }, h('span', { className: 'nks-hint-text' }, copy.hintUnproxiedHtml)) : null,
      (pins.length || (annotate && hasPage)) ? h('div', {
        className: 'nks-float-top',
        'data-nks-float-top': '1',
        onPointerDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
      },
        pins.length ? h('div', { className: 'nks-pins', 'data-nks-pins': String(pins.length), 'aria-live': 'polite' },
          `${pins.length} ${copy.pinsCount}${pins.length === MAX_PINS ? copy.pinsFull : ''}`,
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-undo-pin': '1', 'aria-label': copy.undoPin, onClick: () => setPins((current) => current.slice(0, -1)) }, glyph('undo')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-clear-pins': '1', 'aria-label': copy.clearPins, onClick: () => setPins([]) }, glyph('clear')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-send-all': '1', 'aria-label': copy.sendAll, onClick: onSendAll }, glyph('send'))) : null,
        annotate && hasPage ? h('div', { className: 'nks-hint', 'data-nks-hint': '1' },
          h('span', { className: 'nks-hint-text' }, copy.hintBar),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-exit-annotate': '1', 'aria-label': copy.annotate, onClick: () => setAnnotate(false) }, glyph('exit'))) : null) : null,
      // Style row floats on the frame. It used to be an in-flow sibling with
      // order 0, so it landed above the page and pushed it down on every pick.
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
      // last-good 画面叠加提示：导航/刷新失败但画面还是旧的，地址栏和
      // 画面不能各说各话。新导航/重截成功会自动撤掉。
      staleNav ? h('div', {
        className: 'nks-stale',
        'data-nks-stale': '1',
        role: 'status',
        onPointerDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
      }, fill(copy.staleBanner, { url: shotMeta?.url || '' })) : null,
      // 引擎仍说自己在导航（/open 已超时返回）：超时≠取消，不能恢复成功态。
      !beat && engineNavigating ? h('div', {
        className: 'nks-stale',
        'data-nks-nav-busy': '1',
        role: 'status',
        title: fill(copy.engineBusyTitle, { url: status?.navigation?.url || status?.navigation?.intent || '' }),
      }, copy.engineBusy) : null,
      // srcdoc 是剥离脚本的静态投影，不是活页：角落标出来，别让人以为
      // 在里面点按钮会触发真实交互。
      nativeHtml && domDoc ? h('span', {
        className: 'nks-dom-tag',
        'data-nks-dom-tag': '1',
        title: copy.staticPreview,
      }, copy.staticPreview) : null,
      nativeHtml && domDoc ? h('iframe', {
        className: 'nks-dom',
        title: 'Kitesurf page',
        // No allow-scripts: the host already strips scripts/handlers/js: URLs,
        // and this is the second lock — a sanitizer miss must not become XSS
        // into the DSH host page. Picking is bound from the parent
        // (bindDomFrame → doc.addEventListener), which needs only same-origin.
        sandbox: 'allow-same-origin',
        style: vp ? { width: `${vp.width}px`, height: `${vp.height}px`, flex: 'none', display: 'block', margin: '0 auto', background: '#fff' } : { width: '100%', height: '100%', display: 'block', border: 0 },
        ref: (el) => { domFrameRef.current = el; if (el) writeDomFrame(el) },
      }) : hasPage ? h('img', {
        alt: '',
        draggable: false,
        src: `data:${shotMime || 'image/webp'};base64,${shot}`,
        style: { pointerEvents: annotate ? 'none' : 'auto' },
      }) : h('div', { className: 'nks-empty', 'data-nks-empty': '' },
        // /status always answers ok:true (the call completed); whether the
        // environment can serve a page is `ready` alone.
        // One container, one column: the old layout rendered an absolutely
        // positioned .nks-start on top of a flex-centred .nks-empty, which
        // painted the opaque Start button straight over the error text
        // ("引启动引擎答"). Everything below is a single vertical stack.
        h('div', { className: 'nks-empty-icon' }, glyph('annotate')),
        // The address-bar heartbeat already says "opening"; repeating it here
        // made the pane look like two stacked loading states.
        h('div', { className: 'nks-empty-title' },
          status?.engineMismatch === true ? copy.engineMismatch
            : statusDown ? copy.errorTitle
            : copy.emptyTitle),
        !busy && !statusDown && !status?.engineMismatch ? h('div', { className: 'nks-empty-body' }, copy.emptyBody) : null,
        !busy && statusDown && !status?.engineMismatch ? h('div', { className: 'nks-empty-body' }, copy.errorBody) : null,
        !busy && statusDown ? h('div', { className: 'nks-empty-actions' },
          // Ordinary users get ONE button: it reconciles phase, adopts or
          // repairs the port, starts/resumes the container and polls health.
          h('button', {
            type: 'button',
            className: 'nks-start-btn',
            'data-nks-start-engine': '1',
            'data-nks-prepare': '1',
            onClick: oneClickPrepare,
          }, copy.restartSandbox),
          h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-diagnose': '1', onClick: () => run(() => refreshStatus()) }, copy.retry),
          h('button', { type: 'button', className: 'nks-start-btn', 'data-nks-open-settings': '1', onClick: openSettings }, copy.settings)) : null,
        !busy && !statusDown && !status?.engineMismatch ? h('div', { className: 'nks-empty-actions' },
          h('button', { type: 'button', className: 'nks-empty-link', 'data-nks-try': '1', onClick: () => { setDraftUrl('https://example.com'); openPage('https://example.com') } }, copy.emptyTry)) : null,
        statusDown ? h('div', { className: 'nks-empty-meta' }, `${status?.lastError?.errorId || status?.errorId || (status?.degraded?.length ? status.degraded.join(' / ') : 'kitesurf.engine.failed')} · ${engine.httpBase || ''}`) : null,
        statusDown ? h('div', { className: 'nks-empty-meta' }, status?.lastError?.error || status?.error || '') : null),
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
          h('button', { type: 'submit', className: 'nks-tool', 'data-nks-send': '1', title: copy.injectContext, 'aria-label': copy.injectContext }, glyph('send')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-clear-pick': '1', title: copy.clearSelection, 'aria-label': copy.clearSelection, onClick: (event) => { event.preventDefault(); event.stopPropagation(); clearPick() } }, glyph('exit'))) : h('div', { className: 'nks-note-actions' },
          h('button', {
            type: 'button',
            className: 'nks-tool',
            'data-nks-send': '1',
            title: copy.injectContext,
            'aria-label': copy.injectContext,
            onClick: (event) => { if (event.shiftKey) pinNote(); else injectNote() },
          }, glyph('send')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-copy-note': '1', title: copy.copyContext, 'aria-label': copy.copyContext, onClick: copyNote }, glyph('copy')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-compose': '1', title: copy.inputContext, 'aria-label': copy.inputContext, onClick: () => setComposing(true) }, glyph('annotate')),
          h('button', { type: 'button', className: 'nks-tool', 'data-nks-clear-pick': '1', title: copy.clearSelection, 'aria-label': copy.clearSelection, onClick: (event) => { event.stopPropagation(); clearPick() } }, glyph('exit')))) : null) : null),
      // HITL control bar (ego parity): floats at the bottom of the frame when
      // an agent holds the bridge writer lock or the human holds the override.
      // "停止写入" is honest wording — the pane cannot kill the agent's run
      // (that lives in the host), it can only hold its page writes.
      // T-O-2: relay presence is its OWN tier. conns>0 is a long-lived socket
      // (the agent attached), while lastAt is a recent forwarded write — one
      // boolean would have collapsed "connected" into "acting" and the bar
      // would then claim an agent is writing when it is just listening.
      !beat && (control?.humanHold?.active || control?.writer || relayConns > 0) ? h('div', {
        className: 'nks-hitl',
        'data-nks-hitl': '1',
        role: 'status',
        onPointerDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
      },
        h('span', {
          className: 'nks-hitl-dot',
          'data-held': control?.humanHold?.active ? 'true' : 'false',
          'aria-hidden': true,
        }),
        control?.humanHold?.active
          ? h('span', { className: 'nks-hitl-label' }, copy.hitlHeld)
          : control?.writer
            ? h('span', { className: 'nks-hitl-label' }, copy.hitlAgent, h('b', null, control?.owner || 'agent'))
            : h('span', { className: 'nks-hitl-label' }, relayWriting ? copy.hitlRelayWrite : copy.hitlRelay),
        control?.humanHold?.active
          ? h('button', { type: 'button', className: 'nks-hitl-btn nks-hitl-primary', 'data-nks-hitl-release': '1', onClick: () => controlOp('release') }, copy.hitlRelease)
          : h('button', { type: 'button', className: 'nks-hitl-btn nks-hitl-primary', 'data-nks-hitl-takeover': '1', title: copy.hitlTakeoverTitle, onClick: () => controlOp('takeover') }, copy.hitlTakeover),
      ) : null,
      // ego's "Clicking element" tooltip: brief tool-name flash on each new
      // agent action the bridge records.
      actionToast ? h('div', {
        className: 'nks-act',
        'data-nks-act': '1',
        role: 'status',
        'data-ok': actionToast.ok === false ? 'false' : 'true',
      // T-O-3 receipt: a relay write refused by the human's takeover shows as
      // a blocked action, not as an anonymous agent action.
      }, actionToast.ok === false && String(actionToast.tool || '').startsWith('relay:')
        ? `${copy.hitlRefused} · ${actionToast.tool}`
        : `${copy.hitlAction} ${actionToast.tool}`) : null,
    // One carrier for both toasts: the host Toast through nano-ui. A
    // recoverable failure adds its repair action to the same toast instead of
    // re-implementing the chrome.
    toast ? h(NanoToast, {
      text: toast,
      anchor: workspaceRef.current,
      actions: toastFix ? [{ label: copy.restartSandbox, onClick: repairNow }] : undefined,
    }) : null,
    pick?.elements?.length ? h('pre', {
      'data-nks-pick': '1',
      style: { display: 'none' },
    }, pick.elements.length > 1
      ? multiNote(pick.elements, { url: pageUrl, comment })
      : designNote(pick.elements[0], { url: pageUrl, comment })) : null)
}

/**
 * Managed-sandbox gate: discovery is the only request before the user picks
 * exactly one sandbox; every pane request then travels on that selection's
 * bound fetch. Switching remounts BrowserPane under `key={sandboxId}`, so
 * per-object state (notes, endpoints, URLs) cannot leak between sandboxes.
 * There is no default and no auto-pick of the first row.
 */
function SandboxPicker({ copy, languageOf, theme, onThemeChange }) {
  const [client, setClient] = React.useState(null)
  const [rows, setRows] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [selection, setSelection] = React.useState(null)
  const [retrySeq, setRetrySeq] = React.useState(0)
  const selAbortRef = React.useRef(null)

  React.useEffect(() => {
    const abort = new AbortController()
    let alive = true
    const impl = (url, init = {}) => fetch(url, { ...init, signal: init.signal ?? abort.signal })
    const managed = createManagedDesignClient({ fetch: impl, origin: location.origin })
    ;(async () => {
      try {
        await managed.discover()
        const res = await managed.list()
        const body = await res.json().catch(() => null)
        if (!alive) return
        if (!res.ok) {
          setError(new Error(`sandbox.list HTTP ${res.status}`))
          return
        }
        setClient(managed)
        setRows(listSandboxRows(body))
        setError(null)
      } catch (cause) {
        if (alive) setError(cause)
      }
    })()
    return () => { alive = false; abort.abort(); selAbortRef.current?.abort() }
  }, [retrySeq])

  function choose(sandboxId) {
    if (!client || !sandboxId) return
    selAbortRef.current?.abort()
    const abort = new AbortController()
    selAbortRef.current = abort
    const bound = client.bind(sandboxId)
    const boundFetch = (path, init = {}) => {
      const signals = [init?.signal, abort.signal].filter(Boolean)
      const signal = signals.length > 1 && typeof AbortSignal.any === 'function'
        ? AbortSignal.any(signals) : signals[0]
      return bound(path, { ...init, signal })
    }
    // A withdrawn or changed authorization never selects a replacement.
    setSelection({ sandboxId, fetch: boundFetch })
  }

  const picker = h('div', { className: 'nks-sandbox-bar', 'data-nks-sandbox-bar': '1' },
    h('select', {
      'data-nks-sandbox-select': '1',
      'aria-label': copy.sandboxPick,
      value: selection?.sandboxId ?? '',
      onChange: (event) => { if (event.target.value) choose(event.target.value) },
    },
      h('option', { value: '', disabled: true }, copy.sandboxPick),
      (rows ?? []).map((row) => h('option', { key: row.sandboxId, value: row.sandboxId },
        `${row.name || row.sandboxId.slice(0, 8)} · ${row.envId ?? ''} · ${row.observedState ?? 'unknown'}`))))

  if (error) {
    return h('div', { className: 'nks-empty', 'data-nks-sandbox-error': '1' },
      h('div', { className: 'nks-empty-title' }, copy.sandboxFailed),
      h('div', { className: 'nks-empty-body' }, String(error?.message || error)),
      h('div', { className: 'nks-empty-actions' },
        h(primitives.Button, { variant: 'ghost', size: 'sm', onClick: () => setRetrySeq((n) => n + 1) }, copy.refresh)))
  }
  if (rows === null) return h('div', { className: 'nks-empty', 'data-nks-sandbox-loading': '1' }, copy.sandboxLoading)
  if (rows.length === 0) return h('div', { className: 'nks-empty', 'data-nks-sandbox-empty': '1' }, copy.sandboxEmpty)
  if (!selection) return h('div', { className: 'nks-empty', 'data-nks-sandbox-pick': '1' }, picker)
  return h(React.Fragment, null, picker,
    h(BrowserPane, { key: selection.sandboxId, copy, languageOf, theme, onThemeChange, fetch: selection.fetch, sandboxId: selection.sandboxId }))
}

export const inject = ['slots', 'sidebarRightTabs', 'locale', 'theme']

export function apply(ctx) {
  const style = document.createElement('style')
  style.dataset.nksStyle = 'true'
  style.textContent = NANO_STYLES + STYLE
  document.head.append(style)
  ctx.effect(() => () => style.remove())

  const languageOf = () => ctx.locale?.getSnapshot?.().active ?? 'zh'
  const copy = () => copyFor(languageOf())
  // The host theme service and its change event; the pane hands both to
  // nano-ui's ThemeScope instead of resolving a local scheme.
  const Pane = () => h(SandboxPicker, {
    copy: copy(),
    languageOf,
    theme: ctx.theme,
    onThemeChange: (listener) => ctx.on('theme/change', listener),
  })

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
