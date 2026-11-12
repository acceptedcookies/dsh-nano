window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var $a=Object.create;var ot=Object.defineProperty;var Oa=Object.getOwnPropertyDescriptor;var Ma=Object.getOwnPropertyNames;var Da=Object.getPrototypeOf,Aa=Object.prototype.hasOwnProperty;var V=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var Ia=(e,n)=>{for(var t in n)ot(e,t,{get:n[t],enumerable:!0})},rn=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let i of Ma(n))!Aa.call(e,i)&&i!==t&&ot(e,i,{get:()=>n[i],enumerable:!(a=Oa(n,i))||a.enumerable});return e};var ce=(e,n,t)=>(t=e!=null?$a(Da(e)):{},rn(n||!e||!e.__esModule?ot(t,"default",{value:e,enumerable:!0}):t,e)),Pa=e=>rn(ot({},"__esModule",{value:!0}),e);var zr={};Ia(zr,{DEFAULT_PREFS:()=>Ge,apply:()=>Ir,inject:()=>Or});var Ut=ce(V("react"),1);var $=ce(V("react"),1);var K=ce(V("react"),1),At=V("@deepseek-ai/dsh-client-ui-primitives");var Be=ce(V("react"),1),Xe=V("@deepseek-ai/dsh-client-ui-primitives");function $e({copy:e,title:n,description:t,confirmLabel:a,confirmDisabled:i,busy:o,error:p,danger:v,footer:b,maxHeight:f,width:u,region:l,onConfirm:y,onCancel:w,children:k}){return Be.default.createElement(Xe.Modal,{open:!0,onClose:w,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",f===void 0?"":"nano-dialog-capped",u===void 0?"":"nano-dialog-sized",l===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:b??Be.default.createElement(Be.default.Fragment,null,Be.default.createElement(Xe.Button,{variant:"outline",className:"nano-modal-action",onClick:w},e.cancel),Be.default.createElement(Xe.Button,{variant:v?"outline":"primary",className:v?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:i===!0||o===!0,onClick:y},a??e.confirm))},k,p===void 0?null:Be.default.createElement("p",{className:"nano-dialog-error",role:"alert"},p))}var Fe=ce(V("react"),1),{useCallback:Ur,useEffect:on,useRef:sn,useState:Ba}=Fe.default;function Tt({menu:e,actions:n,onClose:t,width:a=208,maxHeight:i}){let o=sn(null),[p,v]=Ba(0),b=e===null?[]:n,f=b.length,u=sn(b);u.current=b;let l=e===null?null:e.openedAt;if(on(()=>{l!==null&&v(0)},[l]),on(()=>{if(e===null)return;let N=P=>{o.current!==null&&!o.current.contains(P.target)&&t()},I=P=>{if(P.key==="Escape"){P.stopPropagation(),t();return}if(P.key==="ArrowDown"){P.preventDefault(),v(F=>(F+1)%f);return}if(P.key==="ArrowUp"){P.preventDefault(),v(F=>(F-1+f)%f);return}P.key==="Enter"&&(P.preventDefault(),t(),u.current[p]?.run())};return document.addEventListener("pointerdown",N,!0),document.addEventListener("keydown",I,!0),()=>{document.removeEventListener("pointerdown",N,!0),document.removeEventListener("keydown",I,!0)}},[e,p,f,t]),e===null||f===0)return null;let y=f*28+8,w=Math.min(e.x,(window.innerWidth||a)-a-8),k=Math.min(e.y,(window.innerHeight||y)-y-8);return Fe.default.createElement("div",{className:"nano-menu",role:"menu",ref:o,style:{position:"fixed",left:`${Math.max(8,w)}px`,top:`${Math.max(8,k)}px`,minWidth:`${a}px`,...typeof i=="number"?{maxHeight:`${Math.round(i)}px`,overflowY:"auto",overscrollBehavior:"contain"}:{}},"data-nano-menu":"true"},b.map((N,I)=>Fe.default.createElement(ln,{key:N.id,item:N,index:I,active:I===p,onHover:v,onRun:t})))}function ln({item:e,index:n,active:t,onHover:a,onRun:i}){return Fe.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>a(n),onClick:()=>{i(),e.run()}},e.icon===void 0?null:Fe.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),Fe.default.createElement("span",{className:"nano-menu-label"},e.label))}var cn=ce(V("react"),1);function Ct({text:e}){return e==null?null:cn.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var Rt=`
/* \u2500\u2500 anchored popup menu (NanoMenu, NanoMenuItem) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* \u2500\u2500 type tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Every shared surface reads from --nano-* custom properties so an owning
   plugin (e.g. the notepad) can retune typography by declaring them once on its
   own root. Each falls back to the shell default so nano-ui stays self-contained. */
.nano-menu { position: fixed; box-sizing: border-box; padding: 4px; display: flex; flex-direction: column; gap: 1px; z-index: 30;
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-3)); color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 12px);
  box-shadow: var(--dsw-elevation-prominent); backdrop-filter: var(--dsw-menu-backdrop-filter);
  font-family: var(--nano-font-family, inherit);
  font-size: var(--nano-font-size, inherit);
  line-height: var(--nano-line-height, inherit); }
.nano-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm, 8px); padding: 6px 8px;
  font: inherit; text-align: left; cursor: pointer; }
.nano-menu-item[data-active="true"], .nano-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nano-menu-item[data-tone="danger"] { color: var(--dsw-alias-label-error, #e5534b); }
.nano-menu-item[data-tone="danger"][data-active="true"] { background: color-mix(in oklab, var(--dsw-alias-label-error, #e5534b) 14%, transparent); }
.nano-menu-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; color: var(--dsw-alias-label-tertiary); }
.nano-menu-icon svg { display: block; width: 14px; height: 14px; }
.nano-menu-item[data-active="true"] .nano-menu-icon { color: inherit; }
.nano-menu-check { display: inline-flex; color: inherit; }
.nano-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* \u2500\u2500 transient toast (NanoToast) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-toast { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 40;
  padding: 6px 12px; border-radius: var(--dsw-radius-sm, 8px); font-size: var(--nano-toast-size, 12px);
  background: var(--dsw-alias-tooltip-bg, #43454a); color: var(--dsw-alias-tooltip-label, #f9fafb);
  box-shadow: var(--dsw-elevation-prominent); pointer-events: none; }
@keyframes nano-toast-in { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
.nano-toast { animation: nano-toast-in .12s ease; }

/* \u2500\u2500 shared dialog helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-dialog-host { position: fixed; inset: 0; z-index: 50; pointer-events: none;
  /* This host is only the React mount point \u2014 NanoDialog/Modal portals the card
     into document.body at a separate layer. Leaving pointer-events on here
     makes the empty fullscreen host sit above its own card and eat every click. */
  font-family: var(--nano-font-family, inherit);
  font-size: var(--nano-font-size, inherit);
  line-height: var(--nano-line-height, inherit); }
/* The Modal portals straight into document.body, outside .nano-dialog-host, so
   the card itself must consume the owner tokens \u2014 not the host. */
.nano-dialog-card { font-family: var(--nano-font-family, inherit); font-size: var(--nano-font-size, inherit); line-height: var(--nano-line-height, inherit); }
/* The Modal title is a hashed class \u2014 size it and the description through the
   shared tokens so dialogs read at the same scale as the owning surface. */
.nano-dialog-card [class*="title"], .nano-dialog-card [class*="title_"] { font-size: var(--nano-title-size, inherit); }
.nano-dialog-card [class*="description"], .nano-dialog-card [class*="description_"] { font-size: var(--nano-desc-size, inherit); color: var(--dsw-alias-label-secondary); }
/* Shell Button defaults to its own size; pull dialog actions down to the owner
   scale too so the whole card reads at one size. */
.nano-dialog-card button { font-size: var(--nano-font-size, inherit); font-family: var(--nano-font-family, inherit); }
.nano-dialog-error { margin: 8px 0 0; font-size: var(--nano-desc-size, 12px); color: var(--dsw-alias-danger, #cf222e); }
/* Height cap (e.g. 80% of the owning overlay): the card's own overflow:hidden
   clips nothing because the body becomes the flex child that scrolls. The last
   content child is .body \u2014 target it structurally since the class is hashed. */
.nano-dialog-capped { max-height: var(--nano-dlg-max) !important; }
/* Card width follows the owning overlay (e.g. 60% of the floating window) with
   a floor so a narrow window still leaves a readable dialog. The value itself
   is set per dialog on the portal layer (see openNanoDialog). */
.nano-dialog-sized { width: clamp(320px, var(--nano-dlg-w, 380px), 100%) !important; }
/* A tabbed dialog owns a fixed height so switching panels never resizes the
   card under the pointer. The variable is set per dialog (see openNanoDialog). */
.nano-dialog-card { height: var(--nano-dlg-h, auto); }

.nano-dialog-content { display: flex; flex-direction: column; flex: 1; min-height: 0; }
/* The shell Modal's body carries margin-top:20px on top of the header's own
   12px padding-bottom, so a title-only dialog floats its first row ~32px
   below the heading. Pull it back to the header's rhythm. */
.nano-dialog-card [class*="_body_"] { margin-top: 8px; }
/* The shell Button has no danger variant, so a destructive confirm was plain text
   with no hover. Keep the outline metrics and paint the warning color ourselves. */
.nano-modal-action.nano-modal-danger {
  color: var(--dsw-alias-state-error-primary, #f25a5a);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-state-error-primary, #f25a5a);
  transition: background-color .12s ease, color .12s ease, box-shadow .12s ease;
}
@media (hover: hover) {
  .nano-modal-action.nano-modal-danger:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover-danger, rgba(242, 90, 90, .15));
    color: var(--dsw-alias-state-error-secondary, #f25a5a);
    box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-state-error-secondary, #f25a5a);
  }
}
.nano-dialog-content > div:last-child { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
/* Fixed-height tabbed dialog: the shell's body stops scrolling; the card's
   injected body becomes a flex column and its panels own the scroll. */
.nano-dialog-fixed .nano-dialog-content > div:last-child { overflow: hidden; }
.nano-dialog-fixed .np-dlg-body { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }

/* \u2500\u2500 tab strip (nanoTabs) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Follows the DSH settings mobile pattern: one row of pill cells that scroll
   horizontally past the edge instead of wrapping. Sticky so the strip stays
   reachable while a long tab panel scrolls. */
.nano-tabs { position: relative; z-index: 2; display: flex; gap: 2px;
  margin: 0; padding: 4px; border-radius: var(--dsw-radius-md, 10px);
  /* Opaque track: a translucent token lets scrolling panel text show through. */
  background: var(--dsw-alias-bg-layer-1, #202020); overflow-x: auto; scrollbar-width: none;
  font-family: var(--nano-font-family, inherit); font-size: var(--nano-font-size, inherit); }
.nano-tabs::-webkit-scrollbar { display: none; }
/* Equal-width cells fill the strip; horizontal scrolling only kicks in when
   the strip itself is narrower than the labels (mobile / narrow window). */
.nano-tab { flex: 1 1 0; min-width: 0; display: inline-flex; align-items: center; justify-content: center;
  height: 28px; padding: 0 8px; border: 0; border-radius: var(--dsw-radius-sm, 8px);
  background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; cursor: pointer;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (hover: hover) {
  .nano-tab:hover:not([aria-selected="true"]) { color: var(--dsw-alias-label-primary); }
}
/* Selected tab is an inverted solid pill \u2014 the only bright element in the
   strip, so the active section is unmistakable at a glance (and in both
   themes, since both tokens invert together). */
.nano-tab[aria-selected="true"] {
  background: var(--dsw-alias-label-primary, #f7f8f8);
  color: var(--dsw-alias-bg-layer-1, #191919);
  font-weight: 600;
  box-shadow: var(--dsw-elevation-soft);
  position: relative;
}
.nano-tab[aria-selected="true"]::after { content: ''; position: absolute; left: 22%; right: 22%; bottom: -3px;
  height: 2px; border-radius: 1px; background: var(--dsw-alias-focus-ring, #4c9aff); }
.nano-tab:focus-visible { outline: 2px solid var(--dsw-alias-focus-ring, #4c9aff); outline-offset: -2px; }
`;var Sn=ce(V("react"),1);var je="0.1.0";var Qe=/^[a-z0-9][a-z0-9-]{0,39}$/;function he(e,n){if(!Array.isArray(e)||e.length===0)return null;let t=[...e].sort((i,o)=>i-o),a=Math.min(t.length-1,Math.max(0,Math.ceil(n*t.length)-1));return t[a]}function Fa(){return{n:0,window:[],reservoir:[]}}function dn(e,n,t=64){if(e.n+=1,e.window.push(n),e.reservoir.length<t)e.reservoir.push(n);else{let a=Math.floor(Math.random()*e.n);a<t&&(e.reservoir[a]=n)}}function $t(){return{startedAt:0,interactions:[],pendingInteractions:new Map,spanEvents:[],trackEvents:[],loafCount:0,blockingMs:0,forcedLayoutMs:0,nanoScriptMs:0,nanoLoafCount:0,nanoBlockingMs:0,pluginScriptMs:new Map,resources:{nanoClientJsBytes:0,comboResources:0,totalJsBytes:0},counts:new Map}}function un(){return{rootErrors:0,badNames:0,overflowSpans:0,overflowUsage:0,observerErrors:0,observersMissing:0,hostWriteErrors:0}}function za(){return{meta:{version:null,implantedAt:null},own:{interactions:[]},native:{spanMs:[],trackMs:[]},samples:{spans:0,callbacks:0},spans:new Map,tracks:new Map,usage:new Map,profiler:{commits:0,durations:[]}}}function pn(e,n){let t=e.get(n);return t===void 0&&(t=za(),e.set(n,t)),t}function fn(e,n,t){if(!Qe.test(t))return n.badNames+=1,null;let a=e.spans.get(t);if(a===void 0){if(e.spans.size>=32)return n.overflowSpans+=1,null;a=Fa(),e.spans.set(t,a)}return a}function hn(e,n,t,a){return Qe.test(t)?!e.usage.has(t)&&e.usage.size>=32?(n.overflowUsage+=1,!1):(e.usage.set(t,(e.usage.get(t)??0)+a),!0):(n.badNames+=1,!1)}function mn(e,n,t,a){if(!Qe.test(t))return n.badNames+=1,null;let i=e.tracks.get(t);if(i===void 0){if(e.tracks.size>=32)return n.overflowSpans+=1,null;i={kind:a,callbacks:0,live:0,callbackMs:0},e.tracks.set(t,i)}return i}function Ot(e){if(typeof e!="string"||e.length===0)return[];let n=[],t=/dsh-nano-[a-z0-9-]+/g,a;for(;(a=t.exec(e))!==null;)n.includes(a[0])||n.push(a[0]);return n}function gn(e){if(typeof e!="string")return null;let n=/^dsh-nano-([a-z0-9-]+)$/.exec(e);return n===null?null:`nano-${n[1]}`}function it(e){if(e==null||typeof e!="object")return"other";let n=e.attrs??{},t=a=>n[a]!==void 0&&n[a]!==null;return t("data-composer")||t("data-chat-input")?"composer-textarea":t("data-nano-notepad")?"notepad-panel":t("data-nano-model-selector")?"model-trigger":t("data-nxe")?"files-row":t("data-nano-shared-workspace")?"shared-row":t("data-row-key")||t("data-sidebar-row")?"sidebar-row":e.tag==="TEXTAREA"?"composer-textarea":"other"}function W(e){return e==null?null:Math.round(e*10)/10}function xn(e,n){for(e.interactions.push(n);e.interactions.length>50;)e.interactions.shift()}function wn(e,n,t){let a=e.start-1,i=e.start+e.duration+8,o={},p=b=>{let f=o[b];return f===void 0&&(f={spans:0,callbacks:0,spanMs:0,trackMs:0,spanAfterWindow:!1},o[b]=f),f},v=new Map;for(let b of n)if(b.start<=i&&b.end>=a){let f=p(b.pluginId);f.spans+=1,b.end>i&&(f.spanAfterWindow=!0);let u=Math.max(b.start,a),l=Math.min(b.end,i);if(l>u){let y=v.get(b.pluginId);y===void 0&&(y=[],v.set(b.pluginId,y)),y.push([u,l])}}for(let[b,f]of v){f.sort((w,k)=>w[0]-k[0]);let u=0,[l,y]=f[0];for(let w=1;w<f.length;w+=1){let[k,N]=f[w];k>y?(u+=y-l,l=k,y=N):N>y&&(y=N)}u+=y-l,p(b).spanMs=u}for(let b of t)if(b.at>=a&&b.at<=i){let f=p(b.pluginId);f.callbacks+=1,f.trackMs+=b.ms}return o}var Ha=e=>({n:e.n,windowN:e.window.length,p50:W(he(e.window,.5)),p95:W(he(e.window,.95)),maxMs:W(e.window.length===0?null:Math.max(...e.window))});function ja(e,n){let t={},a=e?.plugins?.[n]?.spans;if(a==null)return t;for(let[i,o]of Object.entries(a)){let p=Array.isArray(o.samples)?o.samples:[];t[i]={n:o.n??p.length,p50:W(he(p,.5)),p95:W(he(p,.95))}}return t}function bn(e){let{collector:n,plugins:t,structure:a}=e,i=[],o=n.interactions.map(l=>l.duration),p=l=>W(he(n.interactions.map(y=>y[l]).filter(y=>typeof y=="number"),.95)),v={nativeInpP75:W(he(o,.75)),nativeInpCount:o.length,nativeInpDurationThreshold:16,inputDelayP95:p("inputDelay"),processingP95:p("processing"),presentationP95:p("presentation"),loafCount:n.loafCount,blockingMs:W(n.blockingMs),forcedLayoutMs:W(n.forcedLayoutMs),nanoCombined:{scriptMs:W(n.nanoScriptMs),loafCount:n.nanoLoafCount,blockingMs:W(n.nanoBlockingMs),clientJsBytes:n.resources.nanoClientJsBytes,comboResources:n.resources.comboResources},resources:{nanoClientJsBytes:n.resources.nanoClientJsBytes,totalJsBytes:n.resources.totalJsBytes}},b={};for(let[l,y]of t){let w=y.own.interactions,k={};for(let[P,F]of y.spans)k[P]=Ha(F);let N={};for(let[P,F]of y.tracks)N[P]={kind:F.kind,callbacks:F.callbacks,live:F.live,callbackMs:W(F.callbackMs),totalCallbacks:F.totalCallbacks??F.callbacks,totalCallbackMs:W(F.totalCallbackMs??F.callbackMs)};let I={};for(let[P,F]of y.usage)I[P]=F;b[l]={meta:{version:y.meta.version??null,implantedAt:y.meta.implantedAt??null,implanted:!0},own:{inpP75:W(he(w,.75)),inpCount:w.length},native:{spanMsP95:W(he(y.native.spanMs,.95)),trackMsP95:W(he(y.native.trackMs,.95)),samples:{spans:y.samples.spans,callbacks:y.samples.callbacks}},spans:k,tracks:N,usage:I,hostSpan:ja(e.hostSnapshot,l),profiler:{commits:y.profiler.commits,commitP95:W(he(y.profiler.durations,.95))},scriptMs:W(n.pluginScriptMs.get(l)??0)}}let f={};for(let[l,y]of n.counts)f[l]=y;return n.interactions.some(l=>Object.values(l.samples??{}).some(y=>y.spanAfterWindow))&&i.push("spanAfterWindow: \u6709\u5F02\u6B65 span \u5728\u4EA4\u4E92\u7A97\u53E3\u7ED3\u675F\u540E\u624D settle\uFF0C\u4ECD\u6309\u8D77\u70B9\u5212\u5165\u8BE5\u7A97\u53E3\u3002"),n.nanoBlockingMs>0&&i.push("nanoBlockingMs \u6309\u6574\u6761 LoAF \u6761\u76EE\u5F52\u5E76\uFF1B\u542B\u975E nano \u811A\u672C\u7684\u5E27\u4F1A\u628A\u90A3\u90E8\u5206\u65F6\u95F4\u4E00\u5E76\u8BA1\u5165\u3002"),o.length>0&&o.length<8&&i.push(`nativeInpCount=${o.length} < 8\uFF1Ap75 \u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u4F5C\u9884\u7B97\u5224\u65AD\uFF1B\u8FD9\u4E0D\u662F web-vitals INP\u3002`),i.push("Event Timing \u4E09\u6BB5\uFF1AinputDelay=\u4E3B\u7EBF\u7A0B\u5FD9/\u6392\u961F\uFF0Cprocessing=\u4E8B\u4EF6\u5904\u7406\u5668\uFF0Cpresentation=\u7B49\u4E0B\u4E00\u6B21\u7ED8\u5236\u3002\u9875\u7EA7 nativeInpP75 \u542B presentation\uFF0C\u5C5E\u73AF\u5883\u7EA7\u8BFB\u6570\uFF0C\u4E0D\u6284\u8FDB\u63D2\u4EF6\u884C\uFF08spec \xA75.1\uFF09\uFF1B\u63D2\u4EF6\u9884\u7B97\u4EE5 inputDelayP95/processingP95 \u4E0E native.spanMsP95/trackMsP95 \u4E3A\u51C6\u3002"),i.push("lab \u7684 composer-type \u7528 CDP \u5408\u6210\u6309\u952E\uFF08page.keyboard.type\uFF09\uFF0C\u62AC\u8D77\u7684\u662F presentation \u6BB5\uFF1B\u8BFB\u6570\u6807\u6CE8\u4E3A synthetic input\uFF0C\u4E0D\u7B49\u540C\u771F\u5B9E\u7528\u6237 INP\u3002"),i.push("nanoCombined.scriptMs \u53EA\u7EDF\u8BA1 >50ms \u957F\u5E27\u91CC >5ms \u7684\u811A\u672C\u6761\u76EE\uFF0C\u4E0D\u662F\u603B\u811A\u672C\u8017\u65F6\uFF1B\u5FEB\u800C\u9891\u7E41\u7684\u811A\u672C\u5DE5\u4F5C\u4E0D\u53EF\u89C1\u3002"),i.push("nanoCombined.blockingMs \u628A\u300C\u542B\u4EFB\u4E00 nano \u811A\u672C\u300D\u7684\u6574\u6761 LoAF blockingDuration \u8BA1\u5165\uFF0C\u542B\u975E nano \u90E8\u5206\uFF0C\u5C5E\u8FC7\u5EA6\u5F52\u56E0\u3002"),i.push("nanoCombined.clientJsBytes \u662F\u6240\u6709 dsh-nano-* \u5305 combo \u7684 encodedBodySize \u5408\u8BA1\uFF0C\u4E0D\u662F\u5355\u4E2A\u63D2\u4EF6\u7684\u4F53\u79EF\u3002"),n.pluginScriptMs.size===0&&i.push("\u9010\u5305 scriptMs \u5168\u4E3A 0\uFF1Acombo URL \u542B\u591A\u4E2A\u5305\u540D\uFF0C\u5355\u5305 URL \u6781\u5C11\u51FA\u73B0\uFF1B\u6309 \xA73.1 \u4E0D\u4E88\u62C6\u5206\u3002"),{version:1,meta:{generatedAt:e.meta?.generatedAt??null,scenario:e.meta?.scenario??null,arm:e.meta?.arm??"on",dshVersion:e.meta?.dshVersion??null,chromeMajor:e.meta?.chromeMajor??null,observerVersion:e.meta?.observerVersion??null,contributors:e.meta?.contributors??[],gitSha:e.meta?.gitSha??null,labels:e.meta?.labels??{}},enabled:e.enabled===!0,loafSupported:e.loafSupported!==!1,page:v,plugins:b,counts:f,structure:{...a},notes:i}}function vn(e,n){if(n==null||typeof n!="object")return e;for(let[t,a]of Object.entries(e.plugins??{})){let i=n.plugins?.[t]?.spans;if(i==null)continue;let o={...a.hostSpan??{}};for(let[p,v]of Object.entries(i)){let b=Array.isArray(v.samples)?v.samples:[];o[p]={n:v.n??b.length,p50:W(he(b,.5)),p95:W(he(b,.95))}}a.hostSpan=o}return e.structure={...e.structure??{},hostWriteErrors:(e.structure?.hostWriteErrors??0)+(n.structure?.hostWriteErrors??0)},e.meta={...e.meta??{},hostSinceStart:n.sinceStart??null,hostWrittenAt:n.writtenAt??null,hostEnabled:n.enabled??null,hostWindow:n.window===!0},e}var Ga=4096,Wa=4096,Va=128,de=e=>e.now(),Ka=e=>e!==null&&typeof e=="object"&&typeof e.then=="function";function qa(e){if(e.forceEnabled!==void 0)return e.forceEnabled===!0;try{if(e.localStorage?.getItem?.("dsh-perf-review")==="1")return!0}catch{}try{let n=e.location?.search??"";if(/(?:^|[?&])perf-review=1(?:&|$)/.test(n))return!0}catch{}return!1}function Ja(e,n){let t=e,a=0;for(;t!=null&&typeof t=="object"&&a<12;){let i={tag:t.tagName,attrs:{}};for(let p of n)try{typeof t.hasAttribute=="function"&&t.hasAttribute(p)&&(i.attrs[p]=!0)}catch{}let o=it(i);if(o!=="other")return o;t=t.parentElement??null,a+=1}return it({tag:e?.tagName,attrs:{}})}var Ya=["data-composer","data-chat-input","data-nano-notepad","data-nano-model-selector","data-nxe","data-nano-shared-workspace","data-row-key","data-sidebar-row"],yn='[hidden],[aria-hidden="true"]';function Xa(e,n=null){if(e==null||typeof e!="object"||e.isConnected===!1||e.hidden===!0)return!1;try{if(typeof e.closest=="function"&&e.closest(yn)!==null)return!1}catch{}if(n!=null){if(n.hidden===!0)return!1;try{if(typeof n.closest=="function"&&n.closest(yn)!==null)return!1}catch{}}return!0}function En(e,n=null){for(let t of e??[]){let a=n===null?null:n(t);if(Xa(t,a))return t}return null}var kn=(e,n)=>e==null||n==null?!1:e===n?!0:typeof e.contains=="function"?e.contains(n):!1;function Qa(e,n,t){let a=null;for(let[i,o]of e){if(typeof o._root!="function")continue;let p;try{p=o._root()}catch{t.rootErrors+=1;continue}if(p==null)continue;let v=!1;try{v=kn(p,n)}catch{t.rootErrors+=1;continue}if(v){if(a===null){a={pluginId:i,root:p};continue}try{kn(a.root,p)&&p!==a.root&&(a={pluginId:i,root:p})}catch{t.rootErrors+=1}}}return a?.pluginId??"native"}function Za(e={}){let n=e.performance??globalThis.performance,t=un(),a=new Map,i=[],o=$t();if(e.localStorage===void 0)try{typeof localStorage<"u"&&(e={...e,localStorage})}catch{}if(e.location===void 0)try{typeof location<"u"&&(e={...e,location})}catch{}let p=e.forceEnabled!==void 0?e.forceEnabled===!0:null,v=null,b=!0,f=e.hostSnapshotProvider??null,u=null,l=null,y=null;o.startedAt=de(n);let w=(c,g,h)=>{for(c.push(h);c.length>g;)c.shift()},k=c=>{let g=c.startTime??0,h=c.duration??0,d=typeof c.processingStart=="number"&&c.processingStart>0?c.processingStart:g,T=typeof c.processingEnd=="number"&&c.processingEnd>=d?c.processingEnd:d;return{inputDelay:Math.max(0,d-g),processing:Math.max(0,T-d),presentation:Math.max(0,h-(T-g))}},N=c=>{let g=c.interactionId??0;if(g===0)return;let h=String(g),d=o.pendingInteractions.get(h);if(d===void 0){d={interactionId:g,start:c.startTime,duration:c.duration??0,target:c.target??null,...k(c)},o.pendingInteractions.set(h,d);return}d.start=Math.min(d.start,c.startTime),(c.duration??0)>=d.duration&&(d.duration=c.duration??0,d.target=c.target??d.target,Object.assign(d,k(c)))},I=c=>{for(let[h,d]of o.pendingInteractions){if(d.start+d.duration+8>c)continue;o.pendingInteractions.delete(h);let M=Qa(a,d.target,t),C=Ja(d.target,Ya),j=wn(d,o.spanEvents,o.trackEvents);xn(o,{interactionId:d.interactionId,start:d.start,duration:d.duration,inputDelay:d.inputDelay??0,processing:d.processing??0,presentation:d.presentation??0,owner:M,bucket:C,samples:j});let Y=a.get(M);if(Y!==void 0&&M!=="native"){Y.own.interactions.push(d.duration);continue}for(let[pe,fe]of Object.entries(j)){let be=a.get(pe);be!==void 0&&(be.samples.spans+=fe.spans,be.samples.callbacks+=fe.callbacks,fe.spanMs>0&&be.native.spanMs.push(fe.spanMs),fe.trackMs>0&&be.native.trackMs.push(fe.trackMs))}}let g=de(n)-6e4;o.spanEvents=o.spanEvents.filter(h=>h.end>=g),o.trackEvents=o.trackEvents.filter(h=>h.at>=g)},P=c=>{o.loafCount+=1,o.blockingMs+=c.blockingDuration??0;let g=!1;for(let h of c.scripts??[]){o.forcedLayoutMs+=h.forcedStyleAndLayoutDuration??0;let d=Ot(h.sourceURL??"");if(d.length!==0)if(g=!0,d.length===1){let T=gn(d[0]);T!==null&&o.pluginScriptMs.set(T,(o.pluginScriptMs.get(T)??0)+(h.duration??0))}else o.nanoScriptMs+=h.duration??0}g&&(o.nanoLoafCount+=1,o.nanoBlockingMs+=c.blockingDuration??0)},F=c=>{let g=c.name??"";if(!(c.initiatorType==="script"||/\.js(?:[?&]|$)/.test(g)))return;let d=c.encodedBodySize??0;o.resources.totalJsBytes+=d,Ot(g).length!==0&&(o.resources.nanoClientJsBytes+=d,g.includes("/plugins/??")&&(o.resources.comboResources+=1))},B=()=>{if(v!==null)return;v={installed:!0};let c=e.PerformanceObserver??globalThis.PerformanceObserver;if(typeof c!="function"){b=!1,t.observerErrors+=1;return}let g=(h,d)=>{try{let T=new c(M=>{try{for(let C of M.getEntries())d(C);I(de(n))}catch{t.observerErrors+=1}});return T.observe({type:h,buffered:!0,durationThreshold:16}),T}catch{return t.observersMissing+=1,null}};v.event=g("event",N),v.loaf=g("long-animation-frame",P),v.loaf===null&&(b=!1),v.resource=g("resource",F),v.event===null&&v.loaf===null&&v.resource===null&&(t.observerErrors+=1)},R=()=>{if(y!==null)return;let c=e.setInterval??globalThis.setInterval;typeof c=="function"&&(y=c(()=>{try{I(de(n))}catch{t.observerErrors+=1}},250),typeof y?.unref=="function"&&y.unref())},U=()=>(p===null&&(p=qa(e)),p===!0&&v===null&&(B(),R()),p),H=(c,g,h,d,T)=>{let M=fn(c,t,h);if(M!==null){dn(M,T-d),w(o.spanEvents,Wa,{start:d,end:T,pluginId:g,name:h});try{n.measure?.(`nano:${g}:${h}`,{start:d,end:T})}catch{}}},X=(c,g)=>({span(h,d){if(!Qe.test(h))return t.badNames+=1,d();let T=de(n),M;try{M=d()}catch(C){throw H(g,c,h,T,de(n)),C}return Ka(M)?M.finally(()=>H(g,c,h,T,de(n))):(H(g,c,h,T,de(n)),M)},track(h,d,T={}){let M=mn(g,t,d,h);return{name:d,kind:h,wrap(C){return M===null?C:(...j)=>{let Y=de(n);try{return C(...j)}finally{let pe=de(n)-Y;M.callbacks+=1,M.totalCallbacks=(M.totalCallbacks??0)+1,M.callbackMs+=pe,M.totalCallbackMs=(M.totalCallbackMs??0)+pe,w(o.trackEvents,Ga,{at:Y,ms:pe,pluginId:c,name:d})}}},attach(C=1){M!==null&&(M.live+=C)},detach(C=1){M!==null&&(M.live=Math.max(0,M.live-C))},resetLive(){M!==null&&(M.live=0)}}},count(h,d=1){hn(g,t,h,d)&&o.counts.set(h,(o.counts.get(h)??0)+d)},profiler(h){let d=g._react;if(d==null||d.Profiler==null)return h;let T=(...C)=>{let j=C[2];for(g.profiler.commits+=1,g.profiler.durations.push(j??0);g.profiler.durations.length>Va;)g.profiler.durations.shift()},M=C=>{let j=de(n),Y=d.createElement(h,C);return H(g,c,"react-render",j,de(n)),Y};return function(j){return d.createElement(d.Profiler,{id:`nano:${c}:root`,onRender:T},d.createElement(M,j))}}}),S=()=>({span(c,g){return g()},track(c,g){return{name:g,kind:c,wrap:h=>h,attach(){},detach(){},resetLive(){}}},count(){},profiler(c){return c}}),q=(c,g={})=>{U();let h=pn(a,c);return i.push({pluginId:c,libVersion:g.libVersion??je}),g.version!=null&&(h.meta.version=g.version),h.meta.implantedAt==null&&(h.meta.implantedAt=new Date().toISOString()),typeof g.root=="function"&&(h._root=g.root),g.react!=null&&(h._react=g.react),p?X(c,h):S()},J=()=>{let c=o.counts,g=o.resources;o=$t(),o.counts=c,o.resources=g,o.startedAt=de(n);for(let h of a.values()){h.own.interactions=[],h.native.spanMs=[],h.native.trackMs=[],h.samples={spans:0,callbacks:0};for(let d of h.spans.values())d.window=[];for(let d of h.tracks.values())d.callbacks=0,d.callbackMs=0;h.profiler.durations=[]}};return{join:q,report:(c={},g=null)=>{I(de(n)+6e4);let h=[],d=new Set;for(let Y of i){let pe=`${Y.pluginId}@${Y.libVersion}`;d.has(pe)||(d.add(pe),h.push(Y))}let T=e.navigator??globalThis.navigator,M=/Chrome\/(\d+)/.exec(T?.userAgent??""),C=g??(typeof f=="function"?f():u),j=bn({meta:{generatedAt:new Date().toISOString(),chromeMajor:M===null?null:Number(M[1]),observerVersion:je,contributors:h,...c},collector:o,plugins:a,structure:t,hostSnapshot:C??null,enabled:p===!0,loafSupported:b});return C!=null&&vn(j,C),J(),j},configure:(c={})=>{if(typeof c.hostSnapshotProvider=="function"){f=c.hostSnapshotProvider;return}if(typeof c.hostSnapshotUrl!="string"||f!==null||l!==null||p!==!0)return;let g=e.fetch??globalThis.fetch,h=e.setInterval??globalThis.setInterval;if(typeof g!="function"||typeof h!="function")return;let d=()=>{try{Promise.resolve(g(c.hostSnapshotUrl,{credentials:"same-origin",cache:"no-store"})).then(T=>T?.json?.()).then(T=>{T!==null&&typeof T=="object"&&(u=T)}).catch(()=>{})}catch{}};d(),l=h(d,5e3),typeof l?.unref=="function"&&l.unref()},setHostSnapshotProvider:c=>{f=typeof c=="function"?c:null},reset:J,resetCounters:()=>{o.counts.clear();for(let c of a.values())c.usage.clear()},_state:()=>({collector:o,plugins:a,structure:t,enabled:p,loafSupported:b,contributors:i}),_finalizeDue:I,_absorbEventEntry:N,_absorbLoafEntry:P,_absorbResourceEntry:F,libVersion:je}}function st(e={}){let n=e.global??globalThis;return n.__perfReview==null&&(n.__perfReview=Za(e)),n.__perfReview}typeof window<"u"&&typeof document<"u"&&st();var er="nano-explorer-extra",tr=()=>En(document.querySelectorAll("[data-nxe]")),ee=st().join(er,{version:"0.1.1",libVersion:je,react:Sn.default,root:tr});st().configure({hostSnapshotUrl:"/nano-explorer-extra/perf-review/host?mode=snapshot"});var{useState:It}=K.default;function ze(e){return lt(),K.default.useEffect(()=>{ee.count("dialog-open")},[]),K.default.createElement($e,e)}function lt(e=!0){K.default.useEffect(()=>{if(!e)return;let n=!0,t=(B,R)=>{for(let[U,H]of Object.entries(R))B.style[U]!==H&&(B.style[U]=H)},a=()=>{let B=null,R=0;for(let U of document.querySelectorAll("[data-nxe]")){let H=U.closest("[data-sidebar-right-pane]")??U;if(!(H instanceof HTMLElement))continue;let X=H.getBoundingClientRect(),S=X.width*X.height;S>R&&(B=H,R=S)}return B},i=null,o=null,p=()=>document.querySelector('.nano-dialog-card [class*="nxe-"]')!==null,v=()=>{if(!n||!p())return;let B=a();if(!(B instanceof HTMLElement))return;B!==i&&typeof ResizeObserver=="function"&&(o?.disconnect(),i=B,o=new ResizeObserver(v),o.observe(B));let R=B.getBoundingClientRect();if(!(R.width<1||R.height<1))for(let U of document.querySelectorAll(".nano-dialog-card")){if(U.querySelector('[class*="nxe-"]')===null)continue;let H=U.parentElement;if(H instanceof HTMLElement&&(H.classList.add("nxe-confined-layer"),t(H,{position:"fixed",top:`${R.top}px`,left:`${R.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${R.width}px`,height:`${R.height}px`,padding:"12px"}),U.querySelector(".nxe-scm")!==null)){U.dataset.nxeFill="1";let X=B.getAttribute("data-theme");X&&U.setAttribute("data-theme",X),t(H,{display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",overflow:"hidden"}),t(U,{position:"relative",top:"auto",left:"auto",right:"auto",transform:"none"});let S=U.querySelector("[data-nxe-scm]")?.getAttribute("data-nxe-scm"),q=Math.max(240,R.height-24);if(S==="commit"){let J=`${Math.min(Math.round(window.innerHeight*.5),q)}px`;t(U,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:J,minHeight:J,maxHeight:J,display:"flex",flexDirection:"column",overflow:"hidden"})}else t(U,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:"auto",minHeight:"0",maxHeight:`${Math.min(q,Math.round(R.height*.68))}px`,display:"",flexDirection:"",overflow:""})}}},b=null,f=0,u=!1,l=ee.track("mutation","card-shape"),y=ee.track("raf","card-follow"),w=ee.track("mutation","card-wake"),k=()=>{u&&(l.detach(),y.detach(),u=!1),b!==null&&(b.disconnect(),b=null),f!==0&&(window.cancelAnimationFrame(f),f=0),o?.disconnect(),o=null,i=null,window.removeEventListener("resize",v)},N=B=>{for(let R of B)for(let U of R.addedNodes)if(U instanceof Element&&(U.matches(".nano-dialog-card, .nano-dialog-card *")||U.querySelector(".nano-dialog-card")!==null))return!0;return!1},I=y.wrap(()=>{if(f=0,!!n){if(!p()){k();return}v(),f=window.requestAnimationFrame(I)}}),P=()=>{u||!n||!p()||(u=!0,b=new MutationObserver(l.wrap(B=>{N(B)&&v()})),b.observe(document.body,{childList:!0,subtree:!0}),l.attach(),y.attach(),window.addEventListener("resize",v),v(),f=window.requestAnimationFrame(I))},F=new MutationObserver(w.wrap(B=>{!n||u||!N(B)||P()}));return F.observe(document.body,{childList:!0,subtree:!0}),w.attach(),P(),()=>{n=!1,k(),F.disconnect(),w.detach();for(let B of document.querySelectorAll(".nxe-confined-layer")){B.classList.remove("nxe-confined-layer");for(let R of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction","overflow"])B.style.removeProperty(R)}for(let B of document.querySelectorAll("[data-nxe-fill]"))if(B instanceof HTMLElement){delete B.dataset.nxeFill;for(let R of["width","max-width","height","max-height","min-height","min-width","margin","position","top","left","right","transform","display","flex-direction","overflow"])B.style.removeProperty(R)}}},[e])}function Nn({children:e}){return K.default.createElement("div",{className:"nxe-dialog-field"},e)}function Tn({copy:e,files:n,busy:t,error:a,onConfirm:i,onCancel:o}){let[p,v]=It(""),b=p.trim()==="";return K.default.createElement(ze,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:b,busy:t,error:a,onConfirm:()=>i(p),onCancel:o,description:e.commitBody(n.length)},K.default.createElement(Nn,null,K.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(f=>K.default.createElement("li",{key:f.path,title:f.path},`${f.status} ${f.path}`))),K.default.createElement(At.Input,{value:p,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:f=>v(f.currentTarget.value)})))}function Cn({copy:e,name:n,destination:t,onConfirm:a,onCancel:i}){let[o,p]=It(2);K.default.useEffect(()=>{let b=Date.now()+2e3,f=window.setInterval(()=>{let u=Math.max(0,Math.ceil((b-Date.now())/1e3));p(u),u===0&&window.clearInterval(f)},100);return()=>window.clearInterval(f)},[]);let v=o>0;return K.default.createElement(ze,{copy:e,title:e.moveFolderTitle,confirmLabel:v?e.moveFolderWait(o):e.moveFolderConfirm,confirmDisabled:v,onConfirm:a,onCancel:i,description:K.default.createElement(K.default.Fragment,null,e.moveFolderBody(n,t),K.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${e.moveFolderNote}`))},v?K.default.createElement("p",{className:"nxe-move-countdown",role:"status","data-nxe-move-countdown":"true"},e.moveFolderCountdown(o)):null)}function Pt({copy:e,currentName:n,busy:t,error:a,onConfirm:i,onCancel:o,mode:p="rename"}){let[v,b]=It(n),f=v.trim()==="",u=p==="create";return K.default.createElement(ze,{copy:e,title:u?e.newEntryTitle:e.renameTitle,confirmLabel:u?e.create:e.confirm,busy:t,error:a,confirmDisabled:f,onConfirm:()=>i(v),onCancel:o,description:u?e.newEntryBody(n):e.renameBody(n)},K.default.createElement(Nn,null,K.default.createElement(At.Input,{value:v,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:l=>b(l.currentTarget.value),onKeyDown:l=>{l.key==="Enter"&&!f&&(l.preventDefault(),i(v))}})))}var x=ce(V("react"),1),Q=V("@deepseek-ai/dsh-client-ui-primitives");function Ze(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,a=0;for(;t>=1024&&a<n.length-1;)t/=1024,a+=1;return`${a===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[a]}`}function Rn(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function $n(e){let n=[],t=[],a=[],i=[];for(let o of e??[]){if(o?.status==="U"){i.push(o);continue}if(o?.status==="?"){a.push(o);continue}o?.staged&&n.push({...o,status:o.staged}),o?.unstaged?t.push({...o,status:o.unstaged}):o?.staged||t.push(o)}return{staged:n,unstaged:t,untracked:a,conflicts:i}}function On(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function Bt(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function Mn(e,n,t){let a=new Map(e),i=n===""?"":`${n}/`;for(let o of a.keys())(i===""||o===n||o.startsWith(i))&&a.delete(o);for(let o of t)typeof o?.path=="string"&&o.path!==""&&a.set(o.path,o);return a}function Dn(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let a=Math.floor(t/60);if(a<24)return{unit:"hours",value:a};let i=Math.floor(a/24);if(i<30)return{unit:"days",value:i};let o=new Date(e*1e3),p=v=>String(v).padStart(2,"0");return{unit:"date",value:`${o.getFullYear()}-${p(o.getMonth()+1)}-${p(o.getDate())}`}}var{useEffect:In,useState:ct}=x.default;function nr(e,n){let t=Dn(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function Pn(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function An(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(a=>String(a??"").toLowerCase().includes(t))}function ar({file:e}){let{name:n,dir:t}=On(e.path);return x.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},x.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),x.default.createElement(Q.FileTypeIcon,{kind:(0,Q.classifyFileType)(n),size:16,className:"nxe-change-icon"}),x.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:x.default.createElement("span",{className:"nxe-change-dir"},t)))}function Ft({label:e,count:n,files:t,tone:a}){return t.length===0?null:x.default.createElement("section",{className:"nxe-scm-group","data-tone":a??"default"},x.default.createElement("h3",{className:"nxe-local-head","data-tone":a??"default"},x.default.createElement("span",null,e),x.default.createElement("span",{className:"nxe-local-badge"},String(n))),x.default.createElement("ul",{className:"nxe-drawer-list"},t.slice(0,400).map(i=>x.default.createElement(ar,{key:`${a??""}:${i.path}`,file:i}))))}function rr({copy:e,history:n,currentBranch:t,upstream:a}){let i=n??[],o=a==null?-1:i.findIndex(p=>p.refs.includes(a));return x.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},x.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),i.length===0?x.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):x.default.createElement("ol",{className:"nxe-graph"},i.map((p,v)=>x.default.createElement("li",{key:`${p.hash}:${v}`,className:"nxe-graph-row","data-head":String(v===0),"data-ahead":String(o>=0&&v<o||o===-1&&a!=null),"data-boundary":String(o>=0&&v===o),title:[p.hash,nr(e,p.time),p.subject].filter(b=>b!=="").join(" \xB7 ")},x.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},x.default.createElement("span",{className:"nxe-graph-dot"})),x.default.createElement("span",{className:"nxe-graph-subject"},x.default.createElement("span",{className:"nxe-graph-hash"},p.hash)," ",p.subject),x.default.createElement("span",{className:"nxe-graph-pills"},p.refs.slice(0,2).map(b=>x.default.createElement("span",{key:b,className:"nxe-pill","data-tone":b===t?"current":b===a?"upstream":"default",title:b},b)))))))}function Bn({copy:e,open:n,git:t,onClose:a,onPull:i,onRefresh:o,onCheckout:p,onOpenConflict:v,busy:b,error:f}){lt(n);let[u,l]=ct(""),[y,w]=ct(null);if(In(()=>{n||(l(""),w(null))},[n]),!n)return null;let k=Pn(t),N=t?.upstream??null,I=t?.behind??0,P=t?.ahead??0,F=t?.history??[],B=[...t?.branches??[]].sort((S,q)=>S.current===!0&&q.current!==!0?-1:q.current===!0&&S.current!==!0?1:S.name.localeCompare(q.name)).filter(S=>An(u,[S.name,S.upstream,S.commit])),R=(t?.worktrees??[]).filter(S=>An(u,[S.branch,S.path,S.head,Bt(S.path)])),U=u.trim()!==""&&B.length===0&&R.length===0,H=t?.conflicts??[],X=e.branchDrawerSummary(k??e.detached,N===null?e.noUpstream:`${N} \xB7 ${e.factSyncValue(I,P)}`,e.worktreesHeadingCount((t?.worktrees??[]).length));return x.default.createElement($e,{copy:e,title:e.branchDrawerTitle,description:H.length===0?X:`${X} \xB7 ${e.factConflicted(H.length)}`,error:f,footer:x.default.createElement(x.default.Fragment,null,x.default.createElement(Q.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:a},e.cancel),x.default.createElement(Q.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{o()}},e.refreshGit),N===null?null:x.default.createElement(Q.Button,{variant:"primary",className:"nano-modal-action",disabled:b===!0||I===0,title:I===0?e.pullNothing:e.pullNow,onClick:()=>{i()}},I>0?`${e.pullNow} ${I}`:e.pullNow)),onCancel:a},x.default.createElement("div",{className:"nxe-scm nxe-repo","data-nxe-scm":"branch"},H.length===0?null:x.default.createElement("section",{className:"nxe-repo-conflict","data-nxe-conflicts":String(H.length)},x.default.createElement("p",{className:"nxe-repo-conflict-title"},x.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!")," ",e.factConflicted(H.length)),x.default.createElement("p",{className:"nxe-drawer-empty"},e.branchConflictBlocks),x.default.createElement("ul",{className:"nxe-drawer-list nxe-repo-conflict-list"},H.map(S=>x.default.createElement("li",{key:S,className:"nxe-change","data-status":"U"},x.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),x.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:S,onClick:()=>v?.(S)},S))))),x.default.createElement(rr,{copy:e,history:F,currentBranch:k,upstream:N}),x.default.createElement(Q.Input,{value:u,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:S=>l(S.currentTarget.value)}),U?x.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):x.default.createElement(x.default.Fragment,null,x.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(B.length)),B.length===0?x.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):x.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},B.map(S=>x.default.createElement("li",{key:S.name,className:"nxe-drawer-row","data-current":String(S.current===!0),"data-blocked":String(S.inOtherWorktree===!0)},x.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:S.current===!0||S.inOtherWorktree===!0||b===!0||H.length>0,title:H.length>0?e.branchConflictBlocks:S.inOtherWorktree===!0?e.branchHeldElsewhere:S.name,onClick:()=>w(S.name),"data-nxe-checkout":S.name},S.name),S.commit===""?null:x.default.createElement("span",{className:"nxe-graph-hash"},S.commit),S.upstream===null?null:x.default.createElement("span",{className:"nxe-drawer-row-path",title:S.upstream},S.upstream),H.length>0&&S.current===!0?x.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"danger"},"!"):null,S.inOtherWorktree===!0?x.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):S.current===!0?x.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),x.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(R.length)),R.length===0?x.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):x.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},R.map(S=>{let q=S.path===t?.root,J=S.detached?e.detached:S.branch??e.detached,Se=typeof S.head=="string"?S.head.slice(0,7):"";return x.default.createElement("li",{key:S.path,className:"nxe-worktree","data-current":String(q),title:S.path},x.default.createElement("span",{className:"nxe-worktree-mark","data-current":String(q),"aria-hidden":"true"}),x.default.createElement("span",{className:"nxe-worktree-body"},x.default.createElement("span",{className:"nxe-worktree-line"},x.default.createElement("span",{className:"nxe-worktree-branch"},J),Se===""?null:x.default.createElement("span",{className:"nxe-graph-hash"},Se),q?x.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),x.default.createElement("span",{className:"nxe-worktree-path"},Bt(S.path))))})))),y===null?null:x.default.createElement(ze,{copy:e,title:e.checkoutTitle(y),description:e.checkoutBody(y),confirmLabel:e.checkoutConfirm,busy:b,onConfirm:()=>{let S=y;w(null),p(S)},onCancel:()=>w(null)},x.default.createElement("p",{className:"nxe-drawer-empty"},e.checkoutBody(y))))}function Fn({copy:e,open:n,git:t,onClose:a,onCommit:i,busy:o,error:p,refreshing:v,onOpenConflict:b}){lt(n);let[f,u]=ct(""),[l,y]=ct("all");if(In(()=>{n||y("all")},[n]),!n)return null;let w=t?.files??[],k=$n(w),N=k.conflicts.length>0?k.conflicts:(t?.conflicts??[]).map(R=>({path:R,status:"U"})),I=w.length,P=Pn(t),F=I>0&&N.length===0&&f.trim()!==""&&o!==!0,B=()=>{F&&Promise.resolve(i(f)).then(R=>{R===!0&&u("")})};return x.default.createElement($e,{copy:e,title:x.default.createElement("span",{className:"nxe-drawer-title"},e.commitDrawerTitle,v===!0?x.default.createElement(Q.IconLoadingOutlineRegular,{width:15,height:15,className:"nxe-drawer-spin","aria-label":e.commitRefreshing??"refreshing",role:"status"}):null),description:e.commitDrawerBody(I,P??(t?.detached?e.detached:null)),error:p,footer:x.default.createElement(x.default.Fragment,null,x.default.createElement(Q.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:a},e.cancel),x.default.createElement(Q.Button,{variant:"primary",className:"nano-modal-action",disabled:!F,onClick:B},e.commit)),onCancel:a},x.default.createElement("div",{className:"nxe-scm nxe-local","data-nxe-scm":"commit"},x.default.createElement(Q.Input,{value:f,placeholder:P===null?e.commitPlaceholder:e.commitPlaceholderOn(P),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:R=>u(R.currentTarget.value),onKeyDown:R=>{R.key==="Enter"&&(R.metaKey||R.ctrlKey)&&(R.preventDefault(),B())}}),x.default.createElement("div",{className:"nxe-local-filters",role:"group","aria-label":e.filterChanges},[{id:"all",label:e.filterAll,count:I},{id:"staged",label:e.localStaged,count:k.staged.length},{id:"unstaged",label:e.localUnstaged,count:k.unstaged.length},{id:"untracked",label:e.localUntracked,count:k.untracked.length},...N.length===0?[]:[{id:"conflict",label:e.localConflicts,count:N.length}]].map(R=>x.default.createElement(Q.Button,{key:R.id,variant:l===R.id?"primary":"outline",className:"nxe-local-filter",disabled:R.id!=="all"&&R.count===0,"aria-pressed":String(l===R.id),onClick:()=>y(R.id)},`${R.label} ${R.count}`))),l!=="all"&&l!=="conflict"||N.length===0?null:x.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},x.default.createElement("h3",{className:"nxe-local-head","data-tone":"danger"},x.default.createElement("span",null,e.localConflicts),x.default.createElement("span",{className:"nxe-local-badge"},String(N.length))),x.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),x.default.createElement("ul",{className:"nxe-drawer-list"},N.map(R=>x.default.createElement("li",{key:R.path,className:"nxe-change","data-status":"U"},x.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),x.default.createElement(Q.FileTypeIcon,{kind:(0,Q.classifyFileType)(R.path),size:16,className:"nxe-change-icon"}),x.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:R.path,onClick:()=>b(R.path)},R.path))))),I===0?x.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):x.default.createElement(x.default.Fragment,null,l==="all"||l==="staged"?x.default.createElement(Ft,{label:e.localStaged,count:k.staged.length,files:k.staged,tone:"staged"}):null,l==="all"||l==="unstaged"?x.default.createElement(Ft,{label:e.localUnstaged,count:k.unstaged.length,files:k.unstaged,tone:"unstaged"}):null,l==="all"||l==="untracked"?x.default.createElement(Ft,{label:e.localUntracked,count:k.untracked.length,files:k.untracked,tone:"untracked"}):null)))}var te=ce(V("react"),1),jn=V("@deepseek-ai/dsh-client-ui-primitives");var Ln="dsh-nano-explorer-extra:prefs.v2",or="dsh-nano-explorer-extra:prefs.v1",Ge={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function _n(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function zn(e){let n=_n(e)?e:{},t={};for(let[a,i]of Object.entries(Ge))t[a]=typeof n[a]=="boolean"?n[a]:i;return t}function Un(){try{let e=window.localStorage?.getItem(Ln);if(e!=null)return zn(JSON.parse(e));let n=window.localStorage?.getItem(or);if(n==null)return{...Ge};let t=JSON.parse(n),a=_n(t)?{...t}:{};return delete a.openPreviewOnClick,delete a.openPreviewOnDoubleClick,zn(a)}catch{return{...Ge}}}function Hn(e){try{window.localStorage?.setItem(Ln,JSON.stringify(e))}catch{}}function Oe({label:e,hint:n,checked:t,onChange:a,warn:i}){return te.default.createElement("div",{className:"nxe-settings-row"},te.default.createElement("div",null,te.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:te.default.createElement("div",{className:"nxe-settings-hint"},n),i===!0?te.default.createElement("p",{className:"nxe-warn"},n):null),te.default.createElement(jn.Switch,{checked:t,label:e,onChange:a}))}function Gn({copy:e,open:n,prefs:t,setPref:a,onClose:i}){if(!n)return null;let o=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return te.default.createElement($e,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:i,onConfirm:i},te.default.createElement(Oe,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:p=>a("openPreviewOnClick",p)}),te.default.createElement(Oe,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:p=>a("openPreviewOnDoubleClick",p)}),o?te.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,te.default.createElement(Oe,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:p=>a("showOpenButton",p)}),te.default.createElement(Oe,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:p=>a("showIgnoredBadge",p)}),te.default.createElement(Oe,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:p=>a("showGitStatus",p)}),te.default.createElement(Oe,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:p=>a("showSystemFiles",p)}),te.default.createElement(Oe,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:p=>a("showStatusBar",p)}),te.default.createElement(Oe,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:p=>a("statsExcludeGit",p)}))}var we=ce(V("react"),1),We=V("@deepseek-ai/dsh-client-ui-primitives");function Wn(e){return function({entry:t}){let a=e.current,i=a.copy(),o=a.statusOf(t.path),p=a.ignoredOf(t.path),v=a.linkOf(t.path),b=a.linkBrokenOf(t.path)===!0,f=t.meta?.kind!=="directory",u=f?void 0:a.folderStatusOf(t.path),l=a.showGit()&&!p,y=l?a.stagedOf(t.path):void 0,w=l?a.unstagedOf(t.path):void 0,k=l?a.remoteOf(t.path):void 0;return we.default.createElement("span",{className:"nxe-acc",...p?{"data-nxe-ignored":"true"}:{}},v===void 0?null:we.default.createElement("span",{className:"nxe-acc-link",title:b?i.linkBroken:v?i.symlinkOutsideBadge:i.symlinkBadge,"aria-label":b?i.linkBroken:v?i.symlinkOutsideBadge:i.symlinkBadge,"data-nxe-symlink":b?"broken":v?"outside":"inside"},we.default.createElement(We.IconLinkOutlineRegular,{width:14,height:14,"aria-hidden":"true"})),k===void 0?null:we.default.createElement("span",{className:"nxe-acc-remote","data-status":k.status,"data-direction":k.direction,title:k.direction==="pulled"?i.remotePulled(k.status):i.remotePushed(k.status),"aria-label":k.direction==="pulled"?i.remotePulled(k.status):i.remotePushed(k.status)},`${k.direction==="pulled"?"\u2193":"\u2191"}${k.status}`),l&&o!==void 0?we.default.createElement("span",{className:"nxe-acc-letter","data-status":o,"data-staged":y===void 0?"false":"true",title:a.statusLabel(o,y,w),"aria-label":a.statusLabel(o,y,w)},o):null,l&&u!==void 0?we.default.createElement("span",{className:"nxe-acc-dot","data-status":u,title:a.statusLabel(u),"aria-label":a.statusLabel(u)}):null,p&&a.showIgnoredBadge()?we.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:i.ignoredBadge,"aria-label":i.ignoredBadge},we.default.createElement(We.IconCloseCircleFillRegular,{width:14,height:14,"aria-hidden":"true"})):null,f&&a.showOpenButton()?we.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:i.openFile,"aria-label":`${i.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:N=>{N.stopPropagation(),a.open(t)}},we.default.createElement(We.IconRightUpOutlineRegular,{width:12,height:12,"aria-hidden":"true"})):null)}}var z=ce(V("react"),1);var se=V("@deepseek-ai/dsh-client-ui-primitives");function zt({icon:e,value:n,title:t,scope:a}){return z.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":a},e,z.default.createElement("span",{className:"nxe-figure-value"},n))}function Vn(e){let{copy:n,git:t,stats:a,statsState:i,prefs:o,onOpenBranch:p,onOpenCommit:v}=e,b=(0,z.useRef)(null),[f,u]=(0,z.useState)(!1),l=(0,z.useRef)(0);if((0,z.useEffect)(()=>{let k=b.current;if(!k)return;let N=()=>{let P=k.clientWidth;k.scrollWidth>P+1?(l.current=k.scrollWidth,u(!0)):f&&P>=l.current+32&&u(!1)};N();let I=new ResizeObserver(N);return I.observe(k),()=>I.disconnect()},[f]),!o.showStatusBar)return null;let y=[];if(t==null)y.push(z.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},z.default.createElement(se.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),z.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let k=t.detached?n.detached:t.branch??n.detached,N=t.files?.length??0,I=t.conflicts?.length??0,P=N>0;y.push(z.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(P),"data-conflicted":String(I>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(k,P,I),"aria-label":n.branchButtonTooltip(k,P,I),onClick:p},z.default.createElement(se.IconBranchOutlineRegular,{width:14,height:14}),z.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},k),P?z.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,I>0?z.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&y.push(z.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},z.default.createElement(se.IconArchiveOutlineRegular,{width:14,height:14}),z.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let F=t.upstream===null||t.upstream===void 0?void 0:Rn(t.ahead??0,t.behind??0);y.push(z.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(N),title:n.commitButtonTooltip(N,F===void 0?null:F),"aria-label":n.commitButtonTooltip(N,F===void 0?null:F),onClick:v},z.default.createElement(se.IconRefreshOutlineRegular,{width:14,height:14}),F===void 0?null:z.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},F),z.default.createElement("span",{className:"nxe-chip-badge","data-nxe-pending":String(N),"data-empty":String(N===0)},String(N))))}let w=[];if(!f){if(i==="loading")w.push(z.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(i==="failed")w.push(z.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(a!=null){let k=a.truncated?"+":"",N=o.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";w.push(z.default.createElement(zt,{key:"dirs",scope:"directories",icon:z.default.createElement(se.IconFolderCloseRegular,{width:14,height:14}),value:`${a.directories}${k}`,title:n.statsTooltip(a.files,a.directories,Ze(a.bytes))+N})),w.push(z.default.createElement(zt,{key:"files",scope:"files",icon:z.default.createElement(se.IconDeliverDocRegular,{width:14,height:14}),value:`${a.files}${k}`,title:n.statsTooltip(a.files,a.directories,Ze(a.bytes))+N})),w.push(z.default.createElement(zt,{key:"bytes",scope:"bytes",icon:z.default.createElement(se.IconGaugeOutlineRegular,{width:14,height:14}),value:Ze(a.bytes),title:n.statsSizeTooltip(Ze(a.bytes))+N}))}}return w.push(z.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},z.default.createElement(se.IconSettingsOutlineRegular,{width:14,height:14}))),z.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true","data-crowded":String(f),ref:b},z.default.createElement("div",{className:"nxe-status-left"},y),z.default.createElement("div",{className:"nxe-status-right"},w))}var Kn=ce(V("react"),1);function qn({menu:e,actions:n,onClose:t}){return Kn.default.createElement(Tt,{menu:e,actions:n,onClose:t})}var G=ce(V("@deepseek-ai/dsh-client-ui-primitives"),1);function ge(e,n){let t=Ee(e),a=String(n??"").replace(/\\/gu,"/");return a===""?t:a.startsWith("/")||/^[A-Za-z]:\//u.test(a)?Ee(a):`${t==="/"?"":t}/${a}`.replace(/\/{2,}/gu,"/")}function le(e,n){return Ee(ge(e,n))}function ir(e,n){let t=Ee(e),a=Ee(n);return t===a?!0:a.startsWith(t==="/"?"/":`${t}/`)}function re(e,n){let t=Ee(e),a=Ee(n);return a===t?"":ir(t,a)?a.slice(t==="/"?1:t.length+1):a}function Me(e){let n=Ee(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function De(e){let n=Ee(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function Ee(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var sr=5*60*1e3,lr=20*1e3,cr=2e3,Lt=new Map;async function et(e,n){try{let t=await fetch(`/nano-explorer-extra${e}`,{method:n===void 0?"GET":"POST",headers:n===void 0?void 0:{"content-type":"application/json"},body:n===void 0?void 0:JSON.stringify(n),credentials:"same-origin",cache:"no-store"}),a=await t.json().catch(()=>({error:`HTTP ${t.status}`}));return t.ok?{ok:!0,...a}:{ok:!1,message:a?.error??`HTTP ${t.status}`}}catch(t){return{ok:!1,message:t instanceof Error?t.message:String(t)}}}function dr(e){let n=new Set,t=new Set,a=new Map,i={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},o=0,p,v,b=new Set,f=0,u=0,l=0,y=()=>!0,w=D=>ee.span("apply-status",()=>{i={...i,...D};for(let E of n)E()}),k=(D,E)=>{let c=a.get(D);if(c!==void 0)return c;let g=E().finally(()=>{a.get(D)===g&&a.delete(D)});return a.set(D,g),g},N=(D,E,c=!1,g=!1)=>k(`level:${E}`,()=>ee.span("list-level",async()=>{let h=le(e,E);if(!c){let C=new Map(i.levels);C.get(h)===void 0&&C.set(h,{loading:!0,entries:[]}),C!==i.levels&&w({levels:C})}let d=await et("/list",{sessionId:D,path:E});l=Date.now();let T=new Map(i.levels),M=T.get(h);return d.ok?T.set(h,{entries:d.entries,truncated:d.truncated===!0,outside:d.outside===!0,failed:M?.failed===!0&&M.entries?.length>0?M.failed:!1}):T.set(h,{entries:M?.entries??[],failed:!0,message:d.message,code:d.code}),w({levels:T}),(d.code==="not-found"||d.code==="not-directory")&&E!==e&&Se(E),d.ok&&d.entries.length>0&&!g&&P(D,E,d.entries.map(C=>C.name)),d})),I=(D,E)=>!y()||!Array.isArray(E)||E.length===0?Promise.resolve():k(`ignored:${E.join(",")}`,async()=>{let c=await et("/ignored",{sessionId:D,paths:E});if(!c.ok||!Array.isArray(c.ignored)||c.ignored.length===0)return;let g=i.git?.root,h=g===void 0?"":re(g,e),d=new Set(i.ignoredSet);for(let T of c.ignored)d.add(h===""?T:`${h}/${T}`);w({ignoredSet:d})}),P=(D,E,c)=>{if(!Array.isArray(c)||c.length===0)return Promise.resolve();let g=re(e,E),h=c.map(d=>g===""?d:`${g}/${d}`);return I(D,h)},F=(D,E)=>y()?k(`dirstatus:${E}:${o}`,()=>ee.span("dir-status",async()=>{let c=o,g=await et(`/status?sessionId=${encodeURIComponent(D)}&path=${encodeURIComponent(E)}`);if(c!==o||!g.ok||g.git===null||g.git===void 0)return;b.add(E);let h=g.git.root,d=h??e,T=re(d,E);if(T===E&&T!=="")return;let M=[];for(let C of g.git.files??[]){let j=h===void 0?C.path:`${h.replace(/\/+$/u,"")}/${C.path}`,Y=re(d,j);Y!==j&&M.push({...C,path:Y})}w({directoryStatus:Mn(i.directoryStatus,T,M)})})):Promise.resolve(),B=(D,E)=>{if(!y())return(i.git!==null||i.gitError!==void 0||i.directoryStatus.size!==0)&&(b.clear(),w({git:null,gitError:void 0,directoryStatus:new Map})),Promise.resolve(!1);let c=E==="drawer"?"&detail=drawer":"";return k(`git${c}`,()=>ee.span("git-refresh",async()=>{let g=o+1;o=g;let h=await et(`/status?sessionId=${encodeURIComponent(D)}${c}`);if(g!==o)return!1;if(!h.ok)return w({gitError:h.message}),!1;let d=h.git??null,T=JSON.stringify(d),M=JSON.stringify(h.gitError),C=[...i.expanded].filter(j=>!b.has(j));if(T===p&&M===v){for(let j of C)F(D,j);return C.length>0}p=T,v=M,b.clear(),w({git:d,gitError:h.gitError,directoryStatus:new Map});for(let j of i.expanded)F(D,j);return!0}))},R=D=>k("stats",()=>ee.span("stats-count",async()=>{w({statsState:"loading"});let E=await et(`/status?sessionId=${encodeURIComponent(D)}&only=stats`);if(!E.ok){w({statsState:"failed"});return}w({stats:E.stats??null,statsState:"ok"})})),U=D=>{clearTimeout(f),f=setTimeout(()=>{R(D)},cr)},H=(D,E,c)=>{let g=le(e,E),h=i.expanded.has(g),d=new Set(i.expanded);c?d.add(g):d.delete(g),(d.size!==i.expanded.size||![...d].every(T=>i.expanded.has(T)))&&w({expanded:d}),c&&!h&&ee.count("files-expand"),c&&i.levels.get(g)===void 0&&N(D,E)},X=D=>{let E=[e,...i.expanded];Promise.all(E.map(c=>N(D,c,!0,!0))).then(()=>{let c=[];for(let[g,h]of i.levels)for(let d of h.entries??[])g===""?c.push(d.name):c.push(`${g}/${d.name}`);I(D,c)}),l=Date.now()},S=(D,E)=>N(D,E,!0),q=D=>{let E=le(e,D);if(i.levels.has(E))return;let c=new Map(i.levels);c.set(E,{entries:[]}),w({levels:c})},J=D=>{let E=le(e,D);if(!i.levels.has(E))return;let c=new Map(i.levels);c.delete(E),w({levels:c})},Se=D=>{let E=le(e,D),c=new Map;for(let[T,M]of i.levels)T!==E&&!T.startsWith(`${E}/`)&&c.set(T,M);let g=new Set;for(let T of i.expanded)T!==E&&!T.startsWith(`${E}/`)&&g.add(T);let h=le(e,Me(E)),d=c.get(h);if(d?.entries!==void 0){let T=De(E),M=d.entries.filter(C=>C.name!==T);M.length!==d.entries.length&&c.set(h,{...d,entries:M})}w({levels:c,expanded:g})};return{root:e,get state(){return i},subscribe:D=>(n.add(D),()=>n.delete(D)),mountCount:()=>t.size,mount:D=>{clearTimeout(u),typeof D?.showGitStatus=="function"&&(y=D.showGitStatus);let E={};return t.add(E),i.levels.size===0?N(D.sessionId,e):Date.now()-l>lr&&X(D.sessionId),E},unmount:D=>{t.delete(D),t.size===0&&(u=setTimeout(()=>Lt.delete(e),sr))},loadLevel:N,markIgnored:P,loadDirectoryStatus:F,refreshGit:B,refreshStats:R,queueStats:U,toggle:H,refresh:X,refreshLevel:S,knownEmpty:q,forget:J,collapseUnder:D=>{let E=le(e,D),c=new Set;for(let h of i.expanded)h!==E&&!h.startsWith(`${E}/`)&&c.add(h);let g=new Map;for(let[h,d]of i.levels)h!==E&&!h.startsWith(`${E}/`)&&g.set(h,d);w({expanded:c,levels:g})},dismissGitError:()=>{i.gitError!==void 0&&w({gitError:void 0})}}}function Jn(e){let n=Lt.get(e);if(n!==void 0)return n;let t=dr(e);return Lt.set(e,t),t}var ur=".md";function Yn(e,n){let t=e==="file"?"untitled":"new-folder",a=new Set((n??[]).map(o=>String(o.name??"").toLowerCase())),i=o=>e==="file"?`${t}${o===1?"":`-${o}`}${ur}`:`${t}${o===1?"":`-${o}`}`;for(let o=1;o<1e4;o+=1){let p=i(o);if(!a.has(p.toLowerCase()))return p}throw new Error("cannot find an unused name")}function Xn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:L,useEffect:Ae,useMemo:oe,useRef:ye,useState:ie,useSyncExternalStore:Qn}=$.default,pr=400,fr=15e3,hr=6e4,Zn={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},mr={levels:new Map,entries:[],directories:{},expanded:[],selected:null,setSelected:()=>{},loadLevel:()=>Promise.resolve(),refreshLevel:()=>Promise.resolve(),toggle:()=>{},refresh:()=>Promise.resolve(),forget:()=>{},collapseUnder:()=>{},knownEmpty:()=>{},pending:null,setPending:()=>{}},ea=["U","D","M","A","R","?"],gr=new Set([".git",".DS_Store"]);function ta(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function na(e){let{useTabInfo:n,sessionId:t,useSessions:a,renderSlot:i,renderFactorySlot:o,useContextMenu:p,nxe:v}=e,{tab:b,panel:f}=n(),u=a(r=>r.byId[t]?.cwd),l=v.copy,y=Qn(v.subscribePrefs,v.getPrefs,v.getPrefs),w=oe(()=>u===void 0?null:Jn(u),[u]),k=Qn(L(r=>w?.subscribe(r)??(()=>{}),[w]),L(()=>w?.state??Zn,[w]),()=>Zn),{git:N,gitError:I,stats:P,statsState:F,ignoredSet:B,directoryStatus:R}=k,[U,H]=ie(null),[X,S]=ie(null),[q,J]=ie(!1),[Se,ue]=ie(void 0),[D,E]=ie(void 0),[c,g]=ie(void 0),[h,d]=ie([]);Ae(()=>{let r=!0;return(async()=>{try{let s=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!s.ok)return;let m=await s.json(),A=Array.isArray(m.apps)?m.apps:[];r&&d(A.filter(_=>typeof _=="string"))}catch{}})(),()=>{r=!1}},[]);let[T,M]=ie(null),[C,j]=ie(null),[Y,pe]=ie(null),[fe,be]=ie(null),[qe,Le]=ie(null),Ht=ye(null);Ht.current=qe;let[ia,ft]=ie(!1),[jt,_e]=ie(!1),[Gt,ve]=ie(void 0),[sa,ht]=ie(!1),Ie=ye(0);Ae(()=>{Le(null),ve(void 0),ht(!1),ft(!1),S(null),ue(void 0),M(null),pe(null),be(null),j(null)},[t,u,b.visible]);let Wt=ye({path:"",at:0}),tt=ye(y);tt.current=y;let Z=L(async(r,s)=>{try{let m=await fetch(`/nano-explorer-extra${r}`,{method:s===void 0?"GET":"POST",headers:s===void 0?void 0:{"content-type":"application/json"},body:s===void 0?void 0:JSON.stringify(s),credentials:"same-origin",cache:"no-store"}),A=await m.json().catch(()=>({error:`HTTP ${m.status}`}));return m.ok?{ok:!0,...A}:{ok:!1,message:A?.error??`HTTP ${m.status}`}}catch(m){return{ok:!1,message:m instanceof Error?m.message:String(m)}}},[]);Ae(()=>{if(w===null)return;let r=w.mount({sessionId:t,showGitStatus:()=>tt.current.showGitStatus});return()=>w.unmount(r)},[w,t]);let Vt=oe(()=>{let r=[];for(let[s,m]of k.levels)for(let A of m.entries??[]){let _=s===""?A.name:`${s}/${A.name}`;r.push({...A,path:_})}return r},[k.levels]),Kt=oe(()=>{let r={};for(let[s,m]of k.levels)m.loading===!0&&(m.entries?.length??0)===0?r[s]={loading:!0}:m.failed===!0?r[s]={failure:m.message}:m.truncated===!0&&(r[s]={truncated:!0});return r},[k.levels]),mt=oe(()=>[...k.expanded],[k.expanded]),O=oe(()=>w===null?mr:{levels:k.levels,entries:Vt,directories:Kt,expanded:mt,selected:U,setSelected:H,loadLevel:(r,s)=>w.loadLevel(t,r,s),refreshLevel:r=>w.refreshLevel(t,r),toggle:(r,s)=>w.toggle(t,r,s),refresh:()=>Promise.resolve(w.refresh(t)),forget:r=>w.forget(r),collapseUnder:r=>w.collapseUnder(r),knownEmpty:r=>w.knownEmpty(r),pending:null,setPending:()=>{}},[w,k.levels,k.expanded,mt,Vt,Kt,U,t]),Ne=ye(O);Ne.current=O;let ne=L(r=>w?.refreshGit(t,r??(qe!==null?"drawer":void 0))??Promise.resolve(!1),[w,t,qe]),xe=L(()=>w?.refreshStats(t)??Promise.resolve(),[w,t]),qt=L(r=>{w?.loadDirectoryStatus(t,r)},[w,t]),Jt=L(r=>{Le(r),ve(void 0),ht(!0),ne("drawer").finally(()=>ht(!1))},[ne]);Ae(()=>{ne()},[ne]),Ae(()=>{xe()},[xe]);let Yt=ye(null);Ae(()=>{if(w===null)return;let r=ee.track("interval","git-poll"),s=0,m=0,A=()=>{if(document.hidden)return!1;let rt=Yt.current;return rt!==null&&rt.closest('[hidden], [aria-hidden="true"]')===null},_=()=>{window.clearTimeout(m),m=window.setTimeout(ae,Math.min(fr*2**s,hr))},ae=r.wrap(()=>{if(!A()){_();return}let rt=Ht.current!==null?"drawer":void 0;w.refreshGit(t,rt).then(Ra=>{s=Ra===!0?0:s+1,_()})}),He=()=>{document.hidden||(s=0,A()&&w.refreshGit(t),_())};return document.addEventListener("visibilitychange",He),_(),r.attach(),()=>{window.clearTimeout(m),document.removeEventListener("visibilitychange",He),r.detach()}},[w,t]);let Te=L(()=>{w?.queueStats(t)},[w,t]);Ae(()=>()=>{window.clearTimeout(Ie.current)},[]);let Xt=oe(()=>{let r=new Map;for(let s of O.entries)s.symlink===!0&&r.set(s.path,{outside:s.outside===!0});return r},[O.entries]),gt=oe(()=>Array.isArray(N?.files)?N.files:[],[N]),xt=oe(()=>{let r=new Map;for(let s of gt)r.set(s.path,s);return r},[gt]),Ue=N?.root,ke=oe(()=>{if(R.size===0)return xt;let r=new Map(xt);for(let[s,m]of R)r.set(s,m);return r},[xt,R]),me=L(r=>{if(Ue==null)return;let s=ge(u??"",r);return re(Ue,s)},[Ue,u]),Je=L(r=>{let s=me(r);if(s===void 0)return!1;if(B.has(s))return!0;let m=s.split("/");for(let A=m.length-1;A>0;A-=1)if(B.has(m.slice(0,A).join("/")))return!0;return!1},[B,me]),Ye=L(r=>{let s=me(r);if(s!==void 0)return ke.get(s)?.status},[ke,me]),la=L(r=>{let s=me(r);if(s!==void 0)return ke.get(s)?.staged},[ke,me]),ca=L(r=>{let s=me(r);if(s!==void 0)return ke.get(s)?.unstaged},[ke,me]),wt=oe(()=>{let r=new Map;for(let s of N?.remote?.pushed??[])r.set(s.path,{status:s.status,direction:"pushed"});for(let s of N?.remote?.pulled??[])r.set(s.path,{status:s.status,direction:"pulled"});return r},[N]),da=L(r=>{let s=me(r);if(s!==void 0)return wt.get(s)},[wt,me]),Qt=oe(()=>{let r=new Map,s=(m,A)=>{let _=ea.indexOf(A),ae=r.get(m);(ae===void 0||_>ea.indexOf(ae))&&r.set(m,A)};for(let[m,A]of ke){let _=m.indexOf("/");for(;_!==-1;)s(m.slice(0,_),A.status),_=m.indexOf("/",_+1)}return r},[ke]),bt=L(r=>{let s=me(r);if(s!==void 0)return Qt.get(s)},[Qt,me]),Pe=L(r=>{let s=ge(u??"",r.path),m=u??"",A=re(m,s),ae=m!==""&&A!==s?`dsh-resource://file/session/${encodeURIComponent(t)}/${ta(A)}`:`dsh-resource://file/absolute/${ta(s.replace(/^\/+/,""))}`;f.isFloating?b.actions.openResource(ae):b.actions.openResource(ae,{paneId:f.id})},[u,t,b.actions,f.id,f.isFloating]),Zt=L(r=>{let s=ge(u??"",r),A=re(Ue??u??"",s),_=`dsh-resource://forge-changes/${encodeURIComponent(t)}/local`;try{f.isFloating?b.actions.openResource(_,{params:{path:A}}):b.actions.openResource(_,{params:{path:A},paneId:f.id}),E(void 0)}catch{E(l.viewDiffUnavailable)}},[u,Ue,t,b.actions,f.id,f.isFloating,l.viewDiffUnavailable]),nt=L(async r=>{let s=await Ne.current.loadLevel(r.path);Ne.current.toggle(r.path,!0),s?.ok&&qt(r.path)},[qt]),ua=L(async r=>{J(!0);let s=await Z("/delete",{sessionId:t,path:r.path,kind:r.kind==="directory"?"directory":"file"});if(J(!1),!s.ok){E(s.message);return}pe(null),E(void 0),O.forget(r.path),O.collapseUnder(r.path);let m=Me(r.path);m!==r.path&&await O.refreshLevel(m),O.selected===r.path&&O.setSelected(null),Te()},[t,Z,O,Te]),en=L(r=>{if(u===void 0)return;let s=xr(O,u),m=wr(O,u,s);E(void 0),M({kind:r,directory:s,proposed:Yn(r,m)})},[u,O]),pa=L(async r=>{if(T===null)return;let{kind:s,directory:m}=T,A=Xn(r,l);if(!A.ok){E(A.message);return}J(!0);let _=await Z(s==="file"?"/create-file":"/create-folder",{sessionId:t,directory:m,name:A.name});if(J(!1),!_.ok){E(_.message);return}M(null),E(void 0),await O.refreshLevel(m);let ae=re(u??"",m),He=ge(u??"",`${ae===""?"":`${ae}/`}${A.name}`);O.setSelected(He),s==="folder"&&(O.knownEmpty(He),O.toggle(He,!0)),Te()},[T,l,u,t,Z,O,Te]),fa=L(async(r,s)=>{if(u===void 0)return;let m=ge(u,r.path),A=r.meta?.kind==="directory"?"directory":"file";J(!0),ue(void 0);let _=await Z("/rename",{sessionId:t,path:m,name:s,kind:A});if(J(!1),!_.ok){ue(_.message);return}S(null);let ae=Me(m);await O.refreshLevel(ae),A==="directory"&&O.collapseUnder(m),O.setSelected(ge(u,`${re(u,ae)===""?"":`${re(u,ae)}/`}${s.trim()}`)),Te()},[u,t,Z,O,Te]),vt=L(async(r,s)=>{if(u===void 0)return;let m=ge(u,r.path),A=await Z("/move",{sessionId:t,path:m,directory:s});if(!A.ok){g(A.message),window.clearTimeout(Ie.current),Ie.current=window.setTimeout(()=>g(void 0),4e3);return}let _=Me(m);await O.refreshLevel(_),await O.refreshLevel(s),r.meta?.kind==="directory"&&O.collapseUnder(m),O.selected===m&&O.setSelected(A.path),Te(),ne()},[u,t,Z,O,Te,ne]),yt=L((r,s)=>{if(r.meta?.kind==="directory"){be({entry:r,targetDir:s});return}vt(r,s)},[vt]),ha=L(async r=>{J(!0),ue(void 0);let s=await Z("/commit",{sessionId:t,message:r});if(J(!1),!s.ok){ue(s.message);return}S(null),await O.refresh(),await ne(),await xe()},[t,Z,O,ne,xe]),tn=L(async()=>{_e(!0),ve(void 0);let r=await Z("/pull",{sessionId:t});if(_e(!1),!r.ok){ve(r.message);return}await O.refresh(),await ne(),await xe()},[t,Z,O,ne,xe]),ma=L(async r=>{_e(!0),ve(void 0);let s=await Z("/checkout",{sessionId:t,branch:r});if(_e(!1),!s.ok){ve(s.message);return}g(l.branchSwitched(r)),window.clearTimeout(Ie.current),Ie.current=window.setTimeout(()=>g(void 0),2e3),await O.refresh(),await ne(),await xe()},[t,Z,O,ne,xe,l]),ga=L(async r=>{_e(!0),ve(void 0);let s=await Z("/commit",{sessionId:t,message:r});return _e(!1),s.ok?(await O.refresh(),await ne(),await xe(),!0):(ve(s.message),!1)},[t,Z,O,ne,xe]),kt=L(async(r,s)=>{try{await navigator.clipboard.writeText(s||r),g(l.copied),window.clearTimeout(Ie.current),Ie.current=window.setTimeout(()=>g(void 0),1600)}catch(m){E(m instanceof Error?m.message:String(m))}},[l.copied]),Et=ye(0),Ce=ye(null),St=ye("file"),Re=L(()=>{window.clearTimeout(Et.current),Et.current=0,Ce.current!==null&&Ce.current.removeAttribute("data-nxe-drop"),Ce.current=null},[]),at=L((r,s)=>{Re(),Ce.current=s,s.setAttribute("data-nxe-drop","true"),r!==null&&!Ne.current.expanded.includes(r.path)&&(Et.current=window.setTimeout(()=>{nt(r)},650))},[Re,nt]),Nt=L(r=>(r.preventDefault(),r.stopPropagation(),Re(),r.dataTransfer?.getData("application/x-nxe-move")??""),[Re]),xa=L((r,s)=>({draggable:!0,...s==="directory"?{"data-nxe-folder-status":bt(r.path)}:{"data-nxe-status":Ye(r.path)},...Je(r.path)?{"data-nxe-ignored":"true"}:{},onDragStart:m=>{St.current=s,m.dataTransfer?.setData("application/x-nxe-move",r.path),m.dataTransfer&&(m.dataTransfer.effectAllowed="move")},onDragEnd:Re,onContextMenu:m=>{m.preventDefault(),m.stopPropagation(),Ne.current.setSelected(r.path),ee.count("menu-open"),j({x:m.clientX,y:m.clientY,path:r.path,name:r.name,kind:s,openedAt:Date.now()})},onDragOver:s==="directory"?m=>{m.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(m.preventDefault(),m.stopPropagation(),m.dataTransfer.dropEffect="move",Ce.current!==m.currentTarget&&at(r,m.currentTarget))}:void 0,onDragEnter:s==="directory"?m=>{m.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(m.currentTarget.contains(m.relatedTarget)||at(r,m.currentTarget))}:void 0,onDragLeave:s==="directory"?m=>{m.relatedTarget instanceof Node&&m.currentTarget.contains(m.relatedTarget)||Ce.current===m.currentTarget&&Re()}:void 0,onDrop:s==="directory"?m=>{let A=Nt(m);A!==""&&yt({path:A,meta:{kind:St.current}},r.path)}:void 0}),[Re,at,Nt,yt,bt,Ye,Je]),nn=ye(null);nn.current={copy:()=>l,statusOf:Ye,stagedOf:la,unstagedOf:ca,remoteOf:da,ignoredOf:Je,folderStatusOf:bt,linkBrokenOf:r=>O.levels.get(le(u??"",r))?.code==="broken-link",linkOf:r=>Xt.get(r)?.outside===!0,showGit:()=>y.showGitStatus,showIgnoredBadge:()=>y.showIgnoredBadge,showOpenButton:()=>y.showOpenButton,statusLabel:r=>v.statusLabel(l,r),open:r=>Pe(r)};let an=oe(()=>Wn(nn),[]),wa=oe(()=>({slots:{accessory:an},fallback:null}),[an]),ba=oe(()=>O.entries.filter(r=>y.showSystemFiles||!gr.has(r.name)).map(r=>({path:r.path,name:r.name,meta:{kind:r.type==="directory"?"directory":r.type==="file"?"file":"other",...r.symlink===!0?{link:!0}:{},...r.outside===!0?{outside:!0}:{},...Je(r.path)?{hidden:!0}:{}}})),[O.entries,y.showSystemFiles,Je,ke,wt,Xt]),va=oe(()=>le(u??"",u??""),[u]),ya=L(r=>{if(Ne.current.expanded.includes(r.path)){Ne.current.toggle(r.path,!1);return}nt(r)},[nt]),ka=L(r=>{Ne.current.setSelected(r.path);let s=Date.now(),m=Wt.current,A=m.path===r.path&&s-m.at<=pr;Wt.current={path:r.path,at:s},(A?tt.current.openPreviewOnDoubleClick:tt.current.openPreviewOnClick)&&Pe(r)},[Pe]),Ea=L(()=>!0,[]);if(u===void 0)return $.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},l.noWorkspace);let Sa=o("sidebar.files.tree",{root:va,entries:ba,expanded:mt,directories:O.directories,current:U===null?void 0:le(u,U),onToggle:ya,onOpen:ka,rowTriggerProps:xa,canOpen:Ea},wa);Ae(()=>{let r=s=>{ue(void 0),S({kind:"rename",entry:{path:s.path,name:De(s.path),meta:{kind:s.kind}}})};return v.setRenameHandler(r),()=>v.setRenameHandler(void 0)},[v]);let Na=L(r=>{if(O.pending!==null)return;if(r.key==="F2"&&O.selected!==null){r.preventDefault(),ue(void 0),S({kind:"rename",entry:{path:O.selected,name:De(O.selected),meta:{kind:O.levels.has(O.selected)?"directory":"file"}}});return}let s=O.selected;if(s===null)return;let m=le(u??"",s),A=O.levels.has(m)||O.expanded.includes(m);if(r.key===" "){if(!A)return;r.preventDefault(),O.toggle(s,!O.expanded.includes(m));return}if(r.key==="Enter"){if(r.preventDefault(),A){O.toggle(s,!O.expanded.includes(m));return}Pe({path:m,name:De(s),meta:{kind:"file"}})}},[O,u,Pe]),Ta=X===null?null:X.kind==="commit"?$.default.createElement(Tn,{copy:l,files:gt,busy:q,error:Se,onConfirm:ha,onCancel:()=>{S(null),ue(void 0)}}):$.default.createElement(Pt,{copy:l,currentName:X.entry.name,busy:q,error:Se,onConfirm:r=>fa(X.entry,r),onCancel:()=>{S(null),ue(void 0)}}),Ca=oe(()=>{if(C===null)return[];let r={path:C.path,name:C.name,kind:C.kind},s=h[0],m=A=>{let _=ge(u??"",C.path),ae=C.kind==="directory"?_:Me(_);fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:A,path:ae}),credentials:"same-origin"})};return[s===void 0?null:{id:"reveal",label:l.revealIn(ut[s]??s),icon:$.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(s)}`,alt:"",width:14,height:14}),run:()=>{m(s)}},{id:"copy-path",label:l.copyAbsolute,icon:$.default.createElement(G.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{kt(C.path,C.path)}},{id:"copy-relative",label:l.copyRelative,icon:$.default.createElement(G.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{kt(C.path,re(u??"",C.path))}},C.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:l.openInNotepad,icon:$.default.createElement(G.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let A=await Z("/read",{sessionId:t,path:C.path});if(!A.ok){E(A.message??l.openInNotepadFail);return}E(void 0);let _=C.path.startsWith("/")?C.path:`${u??""}/${C.path}`;await window.__nanoNotepad.import(C.name,A.content,{sourcePath:_})}},C.kind!=="file"||Ye(C.path)===void 0?null:{id:"view-diff",label:l.viewDiff,icon:$.default.createElement(G.IconCompareSplitOutlineRegular,{width:14,height:14}),run:()=>Zt(C.path)},{id:"rename",label:l.rename,icon:$.default.createElement(G.IconEditOutlineRegular,{width:14,height:14}),run:()=>{ue(void 0),S({kind:"rename",entry:{...r,meta:{kind:C.kind}}})}},{id:"delete",label:l.delete,tone:"danger",icon:$.default.createElement(G.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{E(void 0),pe(r)}}].filter(Boolean)},[C,l,h,u,kt,Ye,Zt]);return $.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":v.scheme(),ref:Yt},$.default.createElement("div",{className:"nxe-header"},$.default.createElement("span",{className:"nxe-path",title:u,"data-nxe-path":"true"},u),$.default.createElement(dt,{label:l.newFile,onClick:()=>{en("file")}},Er()),$.default.createElement(dt,{label:l.newFolder,onClick:()=>{en("folder")}},Sr()),$.default.createElement(dt,{label:l.rename,disabled:O.selected===null,onClick:()=>{let r=O.selected;r!==null&&(ue(void 0),S({kind:"rename",entry:{path:r,name:De(r),meta:{kind:O.levels.has(r)?"directory":"file"}}}))}},Tr()),$.default.createElement(Cr,{copy:l,cwd:u??"",apps:h}),$.default.createElement(dt,{label:l.reload,onClick:()=>{O.refresh(),ne()}},Nr())),D===void 0?null:$.default.createElement("p",{className:"nxe-row-note",role:"status"},D),Y===null?null:$.default.createElement(ze,{copy:l,title:l.deleteTitle,busy:q,confirmLabel:l.delete,onConfirm:()=>{ua(Y)},onCancel:()=>{pe(null),E(void 0)},description:$.default.createElement($.default.Fragment,null,l.deleteBody(Y.name),Y.kind==="directory"?$.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${l.deleteFolderNote}`):null)}),fe===null?null:$.default.createElement(Cn,{key:`${fe.entry.path}->${fe.targetDir}`,copy:l,name:De(fe.entry.path),destination:re(u??"",fe.targetDir)||l.moveFolderRoot,onConfirm:()=>{let r=fe;be(null),vt(r.entry,r.targetDir)},onCancel:()=>be(null)}),T===null?null:$.default.createElement(Pt,{copy:l,mode:"create",busy:q,currentName:T.proposed,onConfirm:r=>{pa(r)},onCancel:()=>{M(null),E(void 0)}}),$.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:Na,onDragOver:r=>{r.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(r.preventDefault(),r.dataTransfer.dropEffect="move",Ce.current!==r.currentTarget&&at(null,r.currentTarget))},onDragLeave:r=>{r.relatedTarget instanceof Node&&r.currentTarget.contains(r.relatedTarget)||Ce.current===r.currentTarget&&Re()},onDrop:r=>{let s=Nt(r);s!==""&&yt({path:s,meta:{kind:St.current}},u)}},Sa),$.default.createElement(Ct,{text:c}),I===void 0?null:$.default.createElement("div",{className:"nano-toast nxe-git-alert",role:"alert","data-nxe-git-alert":"true"},$.default.createElement(G.IconWarningOutlineRegular,{width:14,height:14,className:"nxe-git-alert-icon","aria-hidden":"true"}),$.default.createElement("span",{className:"nxe-git-alert-text"},I),$.default.createElement("button",{type:"button",className:"nxe-git-alert-x",title:l.dismiss,"aria-label":l.dismiss,onClick:()=>w?.dismissGitError()},$.default.createElement(G.IconCloseOutlineRegular,{width:12,height:12,"aria-hidden":"true"}))),$.default.createElement(Vn,{copy:l,git:N,stats:P,statsState:F,prefs:y,onOpenBranch:()=>Jt("branch"),onOpenCommit:()=>Jt("commit"),onRetryStats:()=>{xe()},onOpenSettings:()=>ft(!0)}),Ta,$.default.createElement(Gn,{copy:l,open:ia,prefs:y,onClose:()=>ft(!1),setPref:(r,s)=>v.setPref(r,s)}),$.default.createElement(Bn,{copy:l,open:qe==="branch",git:N,busy:jt,error:Gt,onClose:()=>{Le(null),ve(void 0)},onPull:tn,onCheckout:ma,onRefresh:async()=>{await ne()},onOpenConflict:r=>{Pe({path:ge(u??"",r)}),Le(null)}}),$.default.createElement(Fn,{copy:l,open:qe==="commit",git:N,busy:jt,error:Gt,refreshing:sa,onClose:()=>{Le(null),ve(void 0)},onCommit:ga,onPull:tn,onOpenConflict:r=>{Pe({path:ge(u??"",r)}),Le(null)}}),$.default.createElement(qn,{menu:C,copy:l,actions:Ca,onClose:()=>j(null)}))}function dt({label:e,onClick:n,children:t,disabled:a}){return $.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:a===!0},t)}function xr(e,n){let t=e.selected;if(t===null)return n;let a=le(n,t);return e.levels.has(a)?a:Me(a)}function wr(e,n,t){return e.levels.get(le(n,t))?.entries??[]}var br=G.IconPlusOutlineRegular,vr=G.IconFolderCloseRegular,yr=G.IconEditOutlineRegular,kr=G.IconRefreshOutlineRegular;function Er(){return $.default.createElement(br,{width:16,height:16})}function Sr(){return $.default.createElement(vr,{width:16,height:16})}function Nr(){return $.default.createElement(kr,{width:16,height:16})}function Tr(){return $.default.createElement(yr,{width:16,height:16})}function Cr({copy:e,cwd:n,apps:t}){let a=Array.isArray(t)?t:[];if(n===""||a.length===0)return null;let[i,o]=$.default.useState(a[0]),[p,v]=$.default.useState(!1),b=$.default.useRef(null),f=a.includes(i)?i:a[0];$.default.useEffect(()=>{if(!p)return;let l=w=>{b.current!==null&&!b.current.contains(w.target)&&v(!1)},y=w=>{w.key==="Escape"&&v(!1)};return document.addEventListener("pointerdown",l,!0),document.addEventListener("keydown",y,!0),()=>{document.removeEventListener("pointerdown",l,!0),document.removeEventListener("keydown",y,!0)}},[p]);let u=l=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:l,path:n}),credentials:"same-origin"})};return $.default.createElement("span",{className:"nxe-reveal",ref:b,"data-nxe-reveal":f},$.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(ut[f]??f),"aria-label":e.revealIn(ut[f]??f),onClick:()=>{u(f)}},$.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(f)}`,alt:"",width:14,height:14})),$.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),$.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(p),onClick:()=>v(l=>!l)},$.default.createElement(G.IconChevronDownOutlineRegular,{width:10,height:10,"aria-hidden":"true"})),p?$.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},a.map(l=>$.default.createElement("button",{key:l,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{o(l),v(!1),u(l)}},$.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},$.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(l)}`,alt:"",width:14,height:14})),$.default.createElement("span",{className:"nano-menu-label"},ut[l]??l)))):null)}var ut={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var Rr={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0 Git \u72B6\u6001",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",moveFolderTitle:"\u79FB\u52A8\u6587\u4EF6\u5939",moveFolderBody:(e,n)=>`\u5C06\u300C${e}\u300D\u79FB\u52A8\u5230\u300C${n}\u300D\uFF1F`,moveFolderNote:"\u6587\u4EF6\u5939\u91CC\u53EF\u80FD\u6709\u5927\u91CF\u6587\u4EF6\uFF0C\u79FB\u52A8\u540E\u4E0D\u5BB9\u6613\u56DE\u9000\u3002",moveFolderCountdown:e=>`\u786E\u8BA4\u6309\u94AE\u5C06\u5728 ${e} \u79D2\u540E\u53EF\u7528`,moveFolderWait:e=>`\u8BF7\u7B49\u5F85 ${e}s`,moveFolderConfirm:"\u786E\u8BA4\u79FB\u52A8",moveFolderRoot:"\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",viewDiff:"\u67E5\u770B\u5DEE\u5F02",viewDiffUnavailable:"\u539F\u751F\u5DEE\u5F02\u89C6\u56FE\u4E0D\u53EF\u7528\uFF1A\u8BF7\u5728\u63D2\u4EF6\u9875\u542F\u7528\u300C\u53D8\u66F4\u8BF7\u6C42\u4E0E\u5DE5\u4F5C\u6811\u300D",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",dismiss:"\u5173\u95ED",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`\u4ED3\u5E93 \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitRefreshing:"\u6B63\u5728\u8BFB\u53D6\u6700\u65B0\u72B6\u6001",commitDrawerBody:(e,n)=>n?`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${n} \xB7 ${e} \u5904\u6539\u52A8`:`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${e} \u5904\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchConflictBlocks:"\u8FD9\u4E9B\u6587\u4EF6\u8FD8\u5728\u51B2\u7A81\u4E2D\u3002\u89E3\u51B3\u4E4B\u524D\uFF0C\u8FD9\u5F20\u5361\u7247\u91CC\u7684\u5207\u6362\u5206\u652F\u4E0D\u4F1A\u6267\u884C\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,checkoutTitle:e=>`\u5207\u6362\u5230 ${e}\uFF1F`,checkoutBody:e=>`\u5F53\u524D\u5DE5\u4F5C\u6811\u4F1A\u6539\u5230\u5206\u652F ${e}\u3002\u672A\u63D0\u4EA4\u7684\u66F4\u6539\u5982\u679C\u4F1A\u88AB\u8986\u76D6\uFF0C\u5207\u6362\u4F1A\u88AB\u62D2\u7EDD\u3002`,checkoutConfirm:"\u5207\u6362",worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u63D0\u4EA4\u56FE",localStaged:"\u5DF2\u6682\u5B58",localUnstaged:"\u672A\u6682\u5B58",localUntracked:"\u672A\u8DDF\u8E2A",localConflicts:"\u51B2\u7A81",filterChanges:"\u6309\u66F4\u6539\u7C7B\u578B\u7B5B\u9009",filterAll:"\u5168\u90E8",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Refresh Git status",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",moveFolderTitle:"Move folder",moveFolderBody:(e,n)=>`Move \u201C${e}\u201D into \u201C${n}\u201D?`,moveFolderNote:"A folder can hold many files, and a move is not easy to undo.",moveFolderCountdown:e=>`Confirm will be available in ${e}s`,moveFolderWait:e=>`Wait ${e}s`,moveFolderConfirm:"Move folder",moveFolderRoot:"workspace root",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",viewDiff:"View diff",viewDiffUnavailable:"Native diff view unavailable: enable \u201CChange requests & worktrees\u201D on the Plugins page",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",dismiss:"Dismiss",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`Repository \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitRefreshing:"Reading latest status",commitDrawerBody:(e,n)=>n?`Working tree \xB7 ${n} \xB7 ${e} changes`:`Working tree \xB7 ${e} changes`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchConflictBlocks:"These files are still in conflict. Branch switches in this card do nothing until they are resolved.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,checkoutTitle:e=>`Switch to ${e}?`,checkoutBody:e=>`This worktree will move to ${e}. If local changes would be overwritten, the switch is refused.`,checkoutConfirm:"Switch",worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"History",localStaged:"Staged",localUnstaged:"Unstaged",localUntracked:"Untracked",localConflicts:"Conflicts",filterChanges:"Filter by change type",filterAll:"All",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function $r(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function Ve(e){return Rr[$r(e)]}function aa(e,n,t,a){let i={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&a!==void 0?e.statusBoth(i):t!==void 0?e.statusStaged(i):a!==void 0?e.statusUnstaged(i):i}var ra=`${Rt}

[data-nxe] {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  /* The sidebar inherits the shell's 16px body size; a file tree reads at the shipped 13px scale. */
  font-size: 13px; line-height: 18px;
  /* Anchors the transient confirmation, which is taken out of the flow below. */
  position: relative;
}
[data-nxe] .nxe-tree button { font-size: 13px; line-height: 18px; }
[data-nxe] .nxe-tree [data-files-path] { font-size: 13px; }

/* Git status palette: DSH has no Git semantic colors, so this plugin owns them,
   with a separately tuned value per theme rather than one value at two opacities. */
[data-nxe] {
  --nxe-git-modified: #bf8700;
  --nxe-git-added: #1a7f37;
  --nxe-git-deleted: #cf222e;
  --nxe-git-renamed: #0969da;
  --nxe-git-conflicted: #bc4c00;
  --nxe-git-untracked: #1a7f37;
  --nxe-ignored-ink: #6a6f76;
}
[data-nxe][data-theme="dark"] {
  --nxe-git-modified: #d9a63b;
  --nxe-git-added: #4ac26b;
  --nxe-git-deleted: #f85149;
  --nxe-git-renamed: #58a6ff;
  --nxe-git-conflicted: #f0883e;
  --nxe-git-untracked: #3fb950;
  --nxe-ignored-ink: #9aa0a8;
}

.nxe-header {
  display: flex; align-items: center; gap: 4px;
  /* The shipped files page insets its header by 16px left and 6px right; the tree and the status bar
     below reuse the same pair so the tab, the path, the rows, and the footer share one left edge. */
  padding: 6px 8px 6px 16px; border-bottom: .5px solid var(--dsw-alias-border-l2);
}
.nxe-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-tool { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nxe-tool:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nxe-tool:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

.nxe-tree { flex: 1; min-height: 0; overflow: auto; padding: 4px 8px 4px 16px; }
.nxe-tree [data-custom-tree] { height: auto; }

.nxe-row-note { padding: 8px 12px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-note-action { margin-left: 6px; border: 0; background: transparent; color: var(--dsw-alias-link); cursor: pointer; font: inherit; text-decoration: underline; }

/* Row decorations injected through the tree Factory's accessory seat. */
.nxe-acc {
  /* One fixed 14px cell at the right of the rail, not an auto-width group. An auto-width group was
     centred in the 24px seat, so a row with two marks (a symlink glyph plus the ignored close-circle)
     grew to 32px, shifted right by half the growth, and put its last mark 9px off the single-mark
     rows. Anchoring the rail to a fixed cell keeps the rightmost mark on one vertical line; any
     extra marks overflow to the left, into the row's slack, instead of pushing it sideways. */
  display: inline-flex; align-items: center; justify-content: flex-end;
  box-sizing: border-box; width: 14px; min-width: 14px; flex: 0 0 14px; gap: 4px;
}
.nxe-acc-letter {
  box-sizing: border-box; width: 14px; height: 14px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 650; line-height: 14px; letter-spacing: 0;
  padding: 0; margin: 0; text-align: center; white-space: nowrap;
}
/* The mark column is fixed by the letter rule below; this selector only keeps the colour hooks. */
.nxe-acc-letter[data-status] { text-align: right; }
.nxe-acc-letter[data-status="M"] { color: var(--nxe-git-modified); }
.nxe-acc-letter[data-status="A"] { color: var(--nxe-git-added); }
.nxe-acc-letter[data-status="D"] { color: var(--nxe-git-deleted); }
.nxe-acc-letter[data-status="R"] { color: var(--nxe-git-renamed); }
.nxe-acc-letter[data-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-acc-letter[data-status="?"] { color: var(--nxe-git-untracked); }
.nxe-acc-link {
  box-sizing: border-box; width: 14px; height: 14px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--dsw-alias-label-tertiary);
}
.nxe-acc-link svg, .nxe-acc-ignored-letter svg { width: 14px; height: 14px; flex: none; }
.nxe-acc-ignored { font: 400 9px/1 var(--dsw-font-family); color: var(--dsw-alias-label-tertiary); border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-xs); padding: 1px 3px; }
.nxe-open { display: none; }
[data-nxe-hover] .nxe-open, [data-nxe-focus] .nxe-open { display: inline-flex; }

/* Status bar: the composer's metadata line is the reference for size, line height, ink and padding. */
.nxe-status {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  /* No separator rule: the composer footer reads as a quiet row under the content, not a bordered
     strip, and the tree above already ends with its own inset. The block padding gives the row the
     same clearance from the panel edge that the composer gives its metadata line. */
  box-sizing: border-box; padding: 4px 8px 6px 16px;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
  color: var(--dsw-alias-label-tertiary);
}
.nxe-status-left { display: flex; align-items: center; gap: 6px; min-width: 0; }
.nxe-status-right { display: flex; align-items: center; gap: 10px; min-width: 0; }
.nxe-status-right { font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }

/* The footer follows the composer's own statistics row verbatim, so the two read as one surface:
   same size, same line box, same glyph box, same padding, same tertiary ink. Every value below is
   copied from the shipped StatsPills stylesheet rather than chosen here. */
.nxe-status, .nxe-status-left, .nxe-status-right {
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
}
.nxe-chip, .nxe-figure {
  display: inline-flex; align-items: center; gap: 6px;
  box-sizing: border-box; max-width: 100%;
  border: none; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-tertiary);
  font: inherit; font-variant-numeric: tabular-nums; line-height: inherit; white-space: nowrap;
}
/* A chip is pressable, so it keeps the pill's side padding as a hit area. A figure is read, not
   pressed, and eight pixels beside every number stacked into the gaps this row showed. */
.nxe-chip { padding: 1px 8px; }
.nxe-figure { padding: 1px 0; }
.nxe-chip svg, .nxe-figure svg { width: 14px; height: 14px; flex: none; }
.nxe-chip-label, .nxe-figure-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.nxe-chip[data-nxe-git="none"] { color: var(--dsw-alias-label-tertiary); }
.nxe-chip-button { cursor: pointer; }
@media (hover: hover) {
  .nxe-chip-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
}
.nxe-chip-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }
/* The two flags a reader scans for: uncommitted work, and an unresolved merge. Both sit inside the
   line box, so they inherit the same size as every other mark in this row. */
.nxe-chip-flag { font-weight: 700; }
.nxe-chip-flag[data-kind="dirty"] { color: var(--nxe-git-modified); }
.nxe-chip-flag[data-kind="conflict"] { color: var(--dsw-alias-label-error, #e5534b); }
.nxe-chip-static { cursor: default; }
.nxe-chip-count { font-variant-numeric: tabular-nums; }
.nxe-chip-sync { font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }
/* Pending-file count: a filled badge, set off from the bare sync figures like an editor's
   status-bar badge \u2014 the fill is the delimiter, so the chip reads as sync pair, then count. */
.nxe-chip-badge {
  display: inline-flex; align-items: center; justify-content: center;
  box-sizing: border-box; min-width: 18px; height: 16px; padding: 0 5px; margin-left: 2px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 2px); font-weight: 600;
  font-variant-numeric: tabular-nums; line-height: 1;
}
.nxe-chip-badge[data-empty="true"] { font-weight: 400; color: var(--dsw-alias-label-tertiary); }

/* Drawer contents: facts, then the two lists. */
.nxe-fact-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.nxe-fact { display: flex; align-items: baseline; gap: 10px; font-size: 13px; line-height: 18px; }
.nxe-fact-label { flex: 0 0 64px; color: var(--dsw-alias-label-tertiary); }
.nxe-fact-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nxe-fact[data-tone="muted"] .nxe-fact-value { color: var(--dsw-alias-label-tertiary); }
.nxe-fact[data-tone="emphasis"] .nxe-fact-value { color: var(--nxe-git-modified); }
.nxe-fact[data-tone="danger"] .nxe-fact-value { color: var(--dsw-alias-label-error, #e5534b); }
.nxe-drawer-heading {
  margin: 14px 0 6px; font-size: 12px; font-weight: 600;
  color: var(--dsw-alias-label-tertiary); text-transform: none;
}
.nxe-drawer-empty { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.nxe-drawer-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; }
.nxe-drawer-scroll { max-height: 220px; overflow: auto; }
.nxe-drawer-row {
  display: flex; align-items: center; gap: 8px;
  padding: 3px 6px; border-radius: var(--dsw-radius-sm); font-size: 12px; line-height: 18px;
}
.nxe-drawer-row[data-current="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-drawer-row-main { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nxe-drawer-row-path { flex: 0 0 auto; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.nxe-drawer-row-status {
  flex: 0 0 auto; width: 12px; text-align: center; font-weight: 700;
  color: var(--dsw-alias-label-secondary);
}
.nxe-drawer-row-status[data-status="M"], .nxe-change-status[data-status="M"] { color: var(--nxe-git-modified); }
.nxe-drawer-row-status[data-status="A"], .nxe-drawer-row-status[data-status="?"],
.nxe-change-status[data-status="A"], .nxe-change-status[data-status="?"] { color: var(--nxe-git-added); }
.nxe-drawer-row-status[data-status="D"], .nxe-change-status[data-status="D"] { color: var(--nxe-git-deleted); }
.nxe-drawer-row-status[data-status="R"], .nxe-change-status[data-status="R"] { color: var(--nxe-git-renamed); }
.nxe-drawer-row-status[data-status="U"], .nxe-change-status[data-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-drawer-link {
  flex: 1; min-width: 0; text-align: left; border: 0; background: transparent; padding: 0;
  color: var(--dsw-alias-label-error, #e5534b); font: inherit; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nxe-conflict-block { margin-top: 4px; }
.nxe-status-sep { color: var(--dsw-alias-border-l3); }
.nxe-retry {
  border: 0; background: transparent; color: var(--dsw-alias-link); cursor: pointer;
  font: inherit; font-variant-numeric: tabular-nums; padding: 1px 8px; border-radius: var(--dsw-radius-sm);
}

/* Dialog, matching the DSH modal material: translucent mask, no blur. */
.nxe-mask { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: var(--dsw-alias-bg-mask-1, rgba(0,0,0,.45)); }
.nxe-mask[hidden] { display: none !important; }
.nxe-dialog-note-inline { color: var(--dsw-alias-label-tertiary); }
.nxe-move-countdown { margin: 8px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog-error { margin: 8px 0 0; font-size: 12px; color: var(--dsw-alias-danger, #cf222e); }
.nxe-dialog-changed { margin: 6px 0 0; padding: 0; list-style: none; max-height: 120px; overflow: auto; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog-changed li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.nxe-btn { border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); padding: 5px 12px; font: inherit; cursor: pointer; }
.nxe-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-btn[data-primary="true"] { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); color: var(--dsw-alias-label-primary-foreground, #fff); border-color: transparent; }
.nxe-btn:disabled { opacity: .5; cursor: default; }
.nxe-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

/* Settings page. */
.nxe-settings-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
.nxe-settings-row:last-child { border-bottom: 0; }
.nxe-settings-label { font-size: 13px; color: var(--dsw-alias-label-primary); }
.nxe-settings-hint { margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.nxe-warn { margin: 0; padding: 8px; border: .5px solid var(--dsw-alias-warn, #bc4c00); border-radius: var(--dsw-radius-sm); font-size: 12px; color: var(--dsw-alias-label-secondary); }

@media (hover: hover) {
  .nxe-tree [data-custom-tree] button:hover .nxe-open { display: inline-flex; }
}

/* Row-level Git colour, the way VS Code's source-control view tints a changed entry.
   rowTriggerProps stamps the letter on the row's own button (data-nxe-status for files,
   data-nxe-folder-status for a directory's subtree summary), so the tint is a plain attribute
   match \u2014 no :has() descendant scan on every style recalculation, and no chance of a descendant
   row's mark leaking onto its parent the way the old selector did. */
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-status="M"] > span { color: var(--nxe-git-modified); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-status="A"] > span { color: var(--nxe-git-added); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-status="?"] > span { color: var(--nxe-git-untracked); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-status="D"] > span { color: var(--nxe-git-deleted); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-status="R"] > span { color: var(--nxe-git-renamed); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-status="U"] > span { color: var(--nxe-git-conflicted); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-folder-status="M"] > span { color: var(--nxe-git-modified); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-folder-status="A"] > span { color: var(--nxe-git-added); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-folder-status="?"] > span { color: var(--nxe-git-untracked); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-folder-status="D"] > span { color: var(--nxe-git-deleted); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-folder-status="R"] > span { color: var(--nxe-git-renamed); }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-folder-status="U"] > span { color: var(--nxe-git-conflicted); }

/* The folder's glyph takes the same tint so the row reads as one unit. */
[data-nxe] .nxe-tree li[data-files-entry="directory"] > div > button[data-nxe-folder-status] > svg { color: inherit; opacity: .85; }


/* One row geometry for every entry.
   The shipped tree pads directory buttons 4px more than file buttons to make room for a chevron it
   never draws, so a folder icon and a file icon below it sat on different x positions. This plugin
   draws the chevron, so it takes the same 20px gutter on every row and both kinds of icon line up. */
[data-nxe] .nxe-tree li[data-files-entry] > div > button {
  position: relative;
  padding-left: 20px;
  gap: 6px;
}
[data-nxe] .nxe-tree li[data-files-entry] > div > button::before {
  content: "";
  position: absolute; left: 6px; top: 50%;
  width: 5px; height: 5px; margin-top: -2.5px;
  border-right: 1.4px solid currentColor; border-bottom: 1.4px solid currentColor;
  transform: rotate(-45deg); transform-origin: center;
  transition: transform .12s ease; opacity: .75;
  visibility: hidden;
}
/* Only a directory carries a disclosure state. */
[data-nxe] .nxe-tree li[data-files-entry="directory"] > div > button::before { visibility: visible; }
[data-nxe] .nxe-tree li[data-files-entry="directory"] > div > button[aria-expanded="true"]::before {
  transform: rotate(45deg);
}
@media (prefers-reduced-motion: reduce) {
  [data-nxe] .nxe-tree li[data-files-entry] > div > button::before { transition: none; }
}

/* A folder's summary dot: present whenever anything below it changed, visible while collapsed. */
.nxe-acc-dot {
  box-sizing: border-box; width: 14px; height: 14px; flex: none; margin: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border-radius: 0;
}
.nxe-acc-dot::after {
  content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor;
}
.nxe-acc-dot[data-status="M"] { color: var(--nxe-git-modified); }
.nxe-acc-dot[data-status="A"] { color: var(--nxe-git-added); }
.nxe-acc-dot[data-status="D"] { color: var(--nxe-git-deleted); }
.nxe-acc-dot[data-status="R"] { color: var(--nxe-git-renamed); }
.nxe-acc-dot[data-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-acc-dot[data-status="?"] { color: var(--nxe-git-untracked); }
.nxe-acc-dot { corner-shape: round; }

/* Row menu: a floating list anchored at the gesture point, on the shared menu material. */
.nxe-menu {
  position: fixed; z-index: 70; min-width: 168px; padding: 4px;
  border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-prominent); display: flex; flex-direction: column;
}
.nxe-menu-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; text-align: left; border: 0; background: transparent;
  color: var(--dsw-alias-label-primary);
  /* The whole row is one line box, so the label and its glyph share a centre whatever the glyph is. */
  font-family: inherit; font-size: 13px; line-height: 16px;
  padding: 5px 10px; border-radius: var(--dsw-radius-sm); cursor: pointer;
}
/* The icon column is fixed so every label starts on one line whatever the glyph is. */
.nxe-menu-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; flex: none;
  color: var(--dsw-alias-label-secondary);
}
.nxe-menu-icon img { display: block; border-radius: 3px; }
.nxe-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nxe-menu-item[data-active="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-menu-item:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: -2px; }
/* A destructive row is marked by ink, not by a filled background, so it stays a quiet list entry. */
.nxe-menu-item[data-tone="danger"] { color: var(--dsw-alias-label-error, #e5534b); }
.nxe-menu-item[data-tone="danger"] .nxe-menu-icon { color: inherit; }
.nxe-menu-item[data-tone="danger"][data-active="true"] { background: color-mix(in oklab, var(--dsw-alias-label-error, #e5534b) 14%, transparent); }


/* One right rail for status marks. The shipped accessory is as wide as its content, so a folder's
   dot and a file's letter landed on different x positions; a fixed-width rail with its content pushed
   to the end puts every mark on one vertical line. */
/* Same 24px column as the header refresh button, which is the last 24px control inside the
   header's 8px right inset. Centering the mark here puts it on that button's midline. */
[data-nxe] .nxe-tree li[data-files-entry] > div > button + div {
  flex: 0 0 24px;
  width: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: visible;
}
[data-nxe] .nxe-tree li[data-files-entry] > div > button + div:empty { display: none; }

/* Ignored entries: a dedicated muted ink instead of an opacity blend. An opacity overlay sinks into the
   panel and reads as "nearly invisible" on dark; this ink stays clearly readable while obviously
   subordinate to a tracked row in both themes. */
[data-nxe] .nxe-tree li[data-files-entry] > div > button > span:last-child,
[data-nxe] .nxe-tree li[data-files-entry] > div > button > svg { transition: color .12s ease; }
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-ignored] > span:last-child,
[data-nxe] .nxe-tree li[data-files-entry] > div > button[data-nxe-ignored] > svg { color: var(--nxe-ignored-ink); }

/* Persistent Git warning. Same floating surface as the shared toast, but interactive: it carries a
   dismiss button, stays until the read succeeds or the reader closes it, and floats above the
   status bar so it never shifts a row. The doubled class beats the shared toast's pointer-events. */
.nano-toast.nxe-git-alert {
  bottom: 40px; pointer-events: auto;
  display: flex; align-items: center; gap: 6px;
  max-width: min(440px, calc(100% - 32px));
  padding: 6px 8px 6px 10px;
}
.nxe-git-alert-icon { flex: none; color: var(--nxe-git-conflicted); }
.nxe-git-alert-text { flex: 1; min-width: 0; white-space: normal; text-align: left; }
.nxe-git-alert-x {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-tooltip-label, #f9fafb); opacity: .7; cursor: pointer;
}
.nxe-git-alert-x:hover { opacity: 1; background: color-mix(in oklab, currentColor 14%, transparent); }
.nxe-git-alert-x:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

/* The modal's own chrome comes from the shell; this only sets the action button width and the gap
   between the body and its field, matching how the shipped dialogs compose theirs. */
.nxe-modal-action { min-width: 72px; }
.nxe-dialog-field { display: flex; flex-direction: column; gap: 8px; }
.nxe-dialog-error { margin: 8px 0 0; color: var(--dsw-alias-label-error, #e5534b); font-size: 12px; line-height: 18px; }

/* The reveal control mirrors the shipped split button: an application icon, a hairline divider, and a
   chevron, all inside one outlined pill. Geometry follows the shell's toolbar buttons. */
.nxe-reveal {
  position: relative; display: inline-flex; align-items: stretch;
  height: 22px; border: 1px solid var(--dsw-alias-border-subtle, rgba(128,128,128,.28));
  border-radius: var(--dsw-radius-md); overflow: visible;
  background: transparent;
}
.nxe-reveal:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-reveal-main, .nxe-reveal-more {
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: transparent; padding: 0 4px; cursor: pointer;
  color: var(--dsw-alias-label-secondary);
}
.nxe-reveal-main { padding-left: 6px; }
.nxe-reveal-main img { display: block; }
.nxe-reveal-more { padding-right: 5px; padding-left: 3px; }
.nxe-reveal-divider { width: 1px; align-self: center; height: 12px; background: var(--dsw-alias-border-subtle, rgba(128,128,128,.28)); }
.nxe-reveal-main:focus-visible, .nxe-reveal-more:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px;
}

/* The chip's folder sheet sits inline before the label, exactly as the builtin draws it. */
.nxe-title-icon { flex: none; }

/* Remote divergence: a two-character mark (arrow plus letter) that says the other side of the
   upstream changed this path. It sits left of the local letter and reads as metadata, not as a
   second status. */
.nxe-acc-remote {
  box-sizing: border-box; height: 14px; min-width: 14px; flex: none;
  font-size: 11px; font-weight: 650; line-height: 14px; letter-spacing: 0;
  display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;
  color: var(--dsw-alias-label-tertiary); opacity: .95;
}
.nxe-acc-remote[data-direction="pulled"] { color: var(--dsw-alias-link, #2f81f7); }
.nxe-acc-remote[data-direction="pushed"] { color: var(--nxe-git-modified); }

/* A local letter that came through the index keeps full weight; one that lives only in the working
   tree is drawn lighter, so "already staged" is visible without a second glyph. */
.nxe-acc-letter[data-staged="false"] { opacity: .62; }

/* An ignored row's own mark, drawn where the status letter would be. */
.nxe-acc-ignored-letter {
  /* Same 14px cell and the same official icon size as the link mark. Quiet ink, not an alert. */
  box-sizing: border-box; width: 14px; height: 14px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--nxe-ignored-ink); opacity: .8;
}

/* Stashed work, shown beside the branch because a clean tree can still hold a shelf. */
.nxe-stash {
  display: inline-flex; align-items: center; gap: 3px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.nxe-stash svg { width: 14px; height: 14px; flex: none; }
.nxe-stash-count { font-size: 11px; line-height: 1; }

/* Branch rows: the name is the control, the trailing badge explains why a row is unavailable. */
.nxe-drawer-branch {
  flex: 1; min-width: 0; text-align: left; border: 0; background: transparent; padding: 0;
  color: var(--dsw-alias-label-primary); font: inherit; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nxe-drawer-branch:disabled { cursor: default; }
.nxe-drawer-row[data-current="true"] .nxe-drawer-branch { font-weight: 600; }
.nxe-drawer-row[data-blocked="true"] .nxe-drawer-branch { color: var(--dsw-alias-label-tertiary); }
.nxe-drawer-branch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }
.nxe-drawer-row-badge {
  flex: 0 0 auto; font-size: 10px; line-height: 1; padding: 2px 5px;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-interactive-bg-hover);
}
.nxe-drawer-row-badge[data-tone="current"] { color: var(--nxe-git-added); }

/* The footer gear: one icon-sized control at the end of the row, matching the figures' line box. */
.nxe-gear {
  display: inline-flex; align-items: center; justify-content: center;
  box-sizing: border-box; width: 22px; height: 20px; padding: 0;
  border: none; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer;
  flex: none;
}
.nxe-gear svg { width: 14px; height: 14px; flex: none; }
@media (hover: hover) {
  .nxe-gear:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
}
.nxe-gear:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

/* Source-control cards. The Git palette normally lives on [data-nxe], but these cards are portaled
   outside that subtree, so they carry the same variables. The confinement layer copies data-theme
   onto the card, which selects the dark set. */
.nxe-scm {
  display: flex; flex-direction: column; gap: 8px; min-width: 0;
  --nxe-git-modified: #bf8700;
  --nxe-git-added: #1a7f37;
  --nxe-git-deleted: #cf222e;
  --nxe-git-renamed: #0969da;
  --nxe-git-conflicted: #bc4c00;
  --nxe-git-untracked: #1a7f37;
}
[data-theme="dark"] .nxe-scm {
  --nxe-git-modified: #d9a63b;
  --nxe-git-added: #4ac26b;
  --nxe-git-deleted: #f85149;
  --nxe-git-renamed: #58a6ff;
  --nxe-git-conflicted: #f0883e;
  --nxe-git-untracked: #3fb950;
}
.nxe-scm-head {
  margin: 0; font-size: 12px; line-height: 18px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-primary);
}
.nxe-scm-age { margin-left: 8px; color: var(--dsw-alias-label-tertiary); }
.nxe-scm-counts {
  display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0;
  font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.nxe-scm-count[data-tone="danger"] { color: var(--dsw-alias-label-error, #e5534b); }
.nxe-scm-group { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nxe-local-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
/* The shared Button is the dialog-footer size. These filters sit on a 12px file list, so the same
   control is drawn at the row's height. Colour and shape still come from the button variant. */
button.nxe-local-filter {
  box-sizing: border-box; height: 24px; min-height: 0; padding: 0 8px;
  font-size: 12px; line-height: 22px; font-weight: 500;
}
.nxe-local-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin: 10px 0 2px; font-size: 11px; font-weight: 600; line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
.nxe-local-badge {
  flex: none; min-width: 1.4em; padding: 0 6px; border-radius: 999px;
  font-size: 11px; line-height: 16px; text-align: center; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover);
}
.nxe-local-head[data-tone="danger"] { color: var(--dsw-alias-label-error, #e5534b); }
.nxe-local-head[data-tone="danger"] .nxe-local-badge {
  color: var(--dsw-alias-label-error, #e5534b);
  background: color-mix(in oklab, var(--dsw-alias-label-error, #e5534b) 16%, transparent);
}
.nxe-repo .nxe-graph { max-height: 220px; overflow: auto; }
.nxe-repo-conflict {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px; border-radius: var(--dsw-radius-sm);
  background: color-mix(in oklab, var(--dsw-alias-label-error, #e5534b) 14%, transparent);
}
.nxe-repo-conflict-title {
  margin: 0; font-size: 12px; font-weight: 600; line-height: 18px;
  color: var(--dsw-alias-label-error, #e5534b);
}
.nxe-repo-conflict-list { max-height: 120px; overflow: auto; }
.nxe-drawer-row-badge[data-tone="danger"] { color: var(--dsw-alias-label-error, #e5534b); }
.nxe-drawer-title { display: inline-flex; align-items: center; gap: 8px; }
.nxe-drawer-spin { color: var(--dsw-alias-label-tertiary); animation: nxe-spin 0.9s linear infinite; }
@keyframes nxe-spin { to { transform: rotate(360deg); } }
.nxe-change {
  display: grid; grid-template-columns: 14px 16px minmax(0, 1fr); gap: 6px; align-items: baseline;
  min-height: 20px; padding: 1px 4px; border-radius: var(--dsw-radius-sm);
  font-size: 12px; line-height: 18px;
}
.nxe-change-status {
  font-weight: 700; text-align: center; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}
.nxe-change-icon { align-self: center; color: var(--dsw-alias-label-secondary); }
/* A folder catching a dragged row lights up like a drop target should: the hover fill plus a ring
   that reads as a boundary, not as selection. The container itself wears the same ring with a
   larger radius, so dropping onto empty space reads as the workspace root. */
.nxe-tree [data-nxe-drop="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, var(--dsw-alias-link)) inset;
  border-radius: var(--dsw-radius-sm);
}
.nxe-tree[data-nxe-drop="true"] { border-radius: var(--dsw-radius-md, var(--dsw-radius-sm)); }
.nxe-change-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nxe-change-dir { margin-left: 8px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.nxe-graph { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.nxe-graph-row {
  display: grid; grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center; gap: 6px; min-height: 22px;
}
.nxe-graph-rail { position: relative; width: 14px; align-self: stretch; }
.nxe-graph-rail::before {
  content: ""; position: absolute; left: 6px; top: 0; bottom: 0; width: 1px;
  background: var(--dsw-alias-border-l2);
}
.nxe-graph-row:first-child .nxe-graph-rail::before { top: 50%; }
.nxe-graph-row:last-child .nxe-graph-rail::before { bottom: 50%; }
.nxe-graph-row:only-child .nxe-graph-rail::before { display: none; }
.nxe-graph-dot {
  position: absolute; left: 3px; top: 50%; width: 7px; height: 7px; margin-top: -3.5px;
  border-radius: 50%; background: var(--dsw-alias-label-tertiary);
}
.nxe-graph-row[data-head="true"] .nxe-graph-dot { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); }
/* Unpushed region: the ahead rows get the accent ink so the eye can follow the local-only segment
   of the rail; the boundary row is where the remote already has the work. */
.nxe-graph-row[data-ahead="true"] .nxe-graph-dot { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); }
.nxe-graph-row[data-ahead="true"] .nxe-graph-rail::before,
.nxe-graph-row[data-boundary="true"] .nxe-graph-rail::before { background: color-mix(in oklab, var(--dsw-alias-brand-primary, var(--dsw-alias-link)) 55%, var(--dsw-alias-border-l2)); }
.nxe-graph-row[data-ahead="true"] .nxe-graph-subject { color: var(--dsw-alias-label-primary); }
/* The divider sits on the boundary row's top edge, so pushed history below reads as a separate
   region even before the eye reaches the ref pill. */
.nxe-graph-row[data-boundary="true"] { border-top: .5px dashed var(--dsw-alias-border-l2); margin-top: 2px; padding-top: 2px; }
.nxe-pill[data-tone="upstream"] {
  color: var(--dsw-alias-link, var(--dsw-alias-label-secondary));
  background: color-mix(in oklab, var(--dsw-alias-link, #2f81f7) 14%, transparent);
}
.nxe-graph-subject {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary);
}
.nxe-graph-hash {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.nxe-graph-pills { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.nxe-pill {
  max-width: 108px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 0 6px; border-radius: 999px; font-size: 10px; line-height: 16px;
  color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover);
}
.nxe-pill[data-tone="current"] {
  color: var(--dsw-alias-label-primary);
  background: color-mix(in oklab, var(--dsw-alias-brand-primary, var(--dsw-alias-link)) 22%, transparent);
}
/* The footer's dismissal parks at the left edge; the margin pushes the working actions right. */
.nano-dialog-card .nxe-drawer-close { margin-right: auto; }
.nxe-worktree {
  display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 6px; align-items: start;
  padding: 3px 4px; border-radius: var(--dsw-radius-sm);
}
.nxe-worktree[data-current="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-worktree-mark {
  width: 7px; height: 7px; margin-top: 6px; margin-left: 3px; border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.nxe-worktree-mark[data-current="true"] { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); }
.nxe-worktree-body { min-width: 0; display: flex; flex-direction: column; }
.nxe-worktree-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.nxe-worktree-branch {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary);
}
.nxe-worktree[data-current="true"] .nxe-worktree-branch { font-weight: 600; }
.nxe-worktree-path {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary);
}
.nxe-confined-layer .nano-dialog-content { scrollbar-width: thin; scrollbar-color: var(--dsw-alias-border-l2) transparent; }
`;var Ke=ce(V("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:pt,useCallback:Xo,useEffect:Qo,useState:Zo}=Ut.default,Or=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var Mr="files",_t="nano-explorer-extra",Dr=ee.profiler(na),oa={handler:void 0};function Ar(){let e=Un(),n=new Set;return{get:()=>e,set:t=>{e=t,Hn(e);for(let a of n)a()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function Ir(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=ra,document.head.append(n),e.effect(()=>()=>n.remove());let t=Ar(),a=f=>e.sessions.list.getSnapshot().byId[f]?.cwd,i=f=>{oa.handler?.(f)},o=()=>e.locale.getSnapshot().active,p=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",v=()=>({copy:Ve(o()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:f=>t.subscribe(f),scheme:p,statusLabel:aa,onListed:()=>{},setRenameHandler:f=>{oa.handler=f},setPref:(f,u)=>t.set({...t.get(),[f]:u})});e.effect(()=>e.sidebarRightTabs.register({id:_t,kind:Mr,priority:"extension",keepMounted:!0,title:()=>Ve(o()).typeLabel,guide:[{id:"explorer",order:10,title:()=>Ve(o()).typeLabel,description:()=>Ve(o()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:_t,inject:()=>({nxe:v()})},Dr)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:_t},function({useTabInfo:u}){let{tab:l}=u();return pt(Ut.default.Fragment,null,pt(Ke.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),l.title)})),"nano-explorer-extra: files tab title");let b=e.get("contextMenus");if(b!=null)for(let f of["file","directory"])e.effect(()=>b.register({id:`nano-explorer-extra.${f}`,target:f,order:900,resolve:async u=>{let l=Ve(o()),y=u.sessionId===void 0?void 0:a(u.sessionId),w=y===void 0?u.path:re(y,u.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:l.copyRelative,failureLabel:l.copyFailed,run:()=>Pr(w)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:l.rename,failureLabel:l.renameFailed,run:()=>i?.({path:u.path,kind:f==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${f} menu`);e.slots.inject("contextMenu.icon",()=>{let f=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},Br),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},Fr)];return()=>{for(let u of f)u()}})}async function Pr(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function Br(){return pt(Ke.IconLinkOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}function Fr(){return pt(Ke.IconEditOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}return Pa(zr);})();
		return __nxeExport;
	}
});
