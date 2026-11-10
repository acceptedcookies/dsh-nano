window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var fa=Object.create;var Qe=Object.defineProperty;var ha=Object.getOwnPropertyDescriptor;var ma=Object.getOwnPropertyNames;var ga=Object.getPrototypeOf,xa=Object.prototype.hasOwnProperty;var J=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var wa=(e,n)=>{for(var t in n)Qe(e,t,{get:n[t],enumerable:!0})},Vt=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let i of ma(n))!xa.call(e,i)&&i!==t&&Qe(e,i,{get:()=>n[i],enumerable:!(a=ha(n,i))||a.enumerable});return e};var oe=(e,n,t)=>(t=e!=null?fa(ga(e)):{},Vt(n||!e||!e.__esModule?Qe(t,"default",{value:e,enumerable:!0}):t,e)),ba=e=>Vt(Qe({},"__esModule",{value:!0}),e);var yr={};wa(yr,{DEFAULT_PREFS:()=>Fe,apply:()=>xr,inject:()=>hr});var Mt=oe(J("react"),1);var R=oe(J("react"),1);var ie=oe(J("react"),1),St=J("@deepseek-ai/dsh-client-ui-primitives");var De=oe(J("react"),1),Ge=J("@deepseek-ai/dsh-client-ui-primitives");function Ce({copy:e,title:n,description:t,confirmLabel:a,confirmDisabled:i,busy:o,error:u,danger:x,footer:w,maxHeight:p,width:c,region:l,onConfirm:m,onCancel:g,children:N}){return De.default.createElement(Ge.Modal,{open:!0,onClose:g,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",p===void 0?"":"nano-dialog-capped",c===void 0?"":"nano-dialog-sized",l===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:w??De.default.createElement(De.default.Fragment,null,De.default.createElement(Ge.Button,{variant:"outline",className:"nano-modal-action",onClick:g},e.cancel),De.default.createElement(Ge.Button,{variant:x?"outline":"primary",className:x?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:i===!0||o===!0,onClick:m},a??e.confirm))},N,u===void 0?null:De.default.createElement("p",{className:"nano-dialog-error",role:"alert"},u))}var Be=oe(J("react"),1),{useCallback:Sr,useEffect:Kt,useRef:qt,useState:va}=Be.default;function xt({menu:e,actions:n,onClose:t,width:a=208,maxHeight:i}){let o=qt(null),[u,x]=va(0),w=e===null?[]:n,p=w.length,c=qt(w);c.current=w;let l=e===null?null:e.openedAt;if(Kt(()=>{l!==null&&x(0)},[l]),Kt(()=>{if(e===null)return;let T=B=>{o.current!==null&&!o.current.contains(B.target)&&t()},D=B=>{if(B.key==="Escape"){B.stopPropagation(),t();return}if(B.key==="ArrowDown"){B.preventDefault(),x(z=>(z+1)%p);return}if(B.key==="ArrowUp"){B.preventDefault(),x(z=>(z-1+p)%p);return}B.key==="Enter"&&(B.preventDefault(),t(),c.current[u]?.run())};return document.addEventListener("pointerdown",T,!0),document.addEventListener("keydown",D,!0),()=>{document.removeEventListener("pointerdown",T,!0),document.removeEventListener("keydown",D,!0)}},[e,u,p,t]),e===null||p===0)return null;let m=p*28+8,g=Math.min(e.x,(window.innerWidth||a)-a-8),N=Math.min(e.y,(window.innerHeight||m)-m-8);return Be.default.createElement("div",{className:"nano-menu",role:"menu",ref:o,style:{position:"fixed",left:`${Math.max(8,g)}px`,top:`${Math.max(8,N)}px`,minWidth:`${a}px`,...typeof i=="number"?{maxHeight:`${Math.round(i)}px`,overflowY:"auto",overscrollBehavior:"contain"}:{}},"data-nano-menu":"true"},w.map((T,D)=>Be.default.createElement(Jt,{key:T.id,item:T,index:D,active:D===u,onHover:x,onRun:t})))}function Jt({item:e,index:n,active:t,onHover:a,onRun:i}){return Be.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>a(n),onClick:()=>{i(),e.run()}},e.icon===void 0?null:Be.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),Be.default.createElement("span",{className:"nano-menu-label"},e.label))}var Yt=oe(J("react"),1);function wt({text:e}){return e==null?null:Yt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var bt=`
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
.nano-dialog-host { position: fixed; inset: 0; z-index: 50;
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
`;var pn=oe(J("react"),1);var ze="0.1.0";var We=/^[a-z0-9][a-z0-9-]{0,39}$/;function ce(e,n){if(!Array.isArray(e)||e.length===0)return null;let t=[...e].sort((i,o)=>i-o),a=Math.min(t.length-1,Math.max(0,Math.ceil(n*t.length)-1));return t[a]}function ya(){return{n:0,window:[],reservoir:[]}}function Xt(e,n,t=64){if(e.n+=1,e.window.push(n),e.reservoir.length<t)e.reservoir.push(n);else{let a=Math.floor(Math.random()*e.n);a<t&&(e.reservoir[a]=n)}}function vt(){return{startedAt:0,interactions:[],pendingInteractions:new Map,spanEvents:[],trackEvents:[],loafCount:0,blockingMs:0,forcedLayoutMs:0,nanoScriptMs:0,nanoLoafCount:0,nanoBlockingMs:0,pluginScriptMs:new Map,resources:{nanoClientJsBytes:0,comboResources:0,totalJsBytes:0},counts:new Map}}function Qt(){return{rootErrors:0,badNames:0,overflowSpans:0,overflowUsage:0,observerErrors:0,observersMissing:0,hostWriteErrors:0}}function ka(){return{meta:{version:null,implantedAt:null},own:{interactions:[]},native:{spanMs:[],trackMs:[]},samples:{spans:0,callbacks:0},spans:new Map,tracks:new Map,usage:new Map,profiler:{commits:0,durations:[]}}}function Zt(e,n){let t=e.get(n);return t===void 0&&(t=ka(),e.set(n,t)),t}function en(e,n,t){if(!We.test(t))return n.badNames+=1,null;let a=e.spans.get(t);if(a===void 0){if(e.spans.size>=32)return n.overflowSpans+=1,null;a=ya(),e.spans.set(t,a)}return a}function tn(e,n,t,a){return We.test(t)?!e.usage.has(t)&&e.usage.size>=32?(n.overflowUsage+=1,!1):(e.usage.set(t,(e.usage.get(t)??0)+a),!0):(n.badNames+=1,!1)}function nn(e,n,t,a){if(!We.test(t))return n.badNames+=1,null;let i=e.tracks.get(t);if(i===void 0){if(e.tracks.size>=32)return n.overflowSpans+=1,null;i={kind:a,callbacks:0,live:0,callbackMs:0},e.tracks.set(t,i)}return i}function yt(e){if(typeof e!="string"||e.length===0)return[];let n=[],t=/dsh-nano-[a-z0-9-]+/g,a;for(;(a=t.exec(e))!==null;)n.includes(a[0])||n.push(a[0]);return n}function an(e){if(typeof e!="string")return null;let n=/^dsh-nano-([a-z0-9-]+)$/.exec(e);return n===null?null:`nano-${n[1]}`}function Ze(e){if(e==null||typeof e!="object")return"other";let n=e.attrs??{},t=a=>n[a]!==void 0&&n[a]!==null;return t("data-composer")||t("data-chat-input")?"composer-textarea":t("data-nano-notepad")?"notepad-panel":t("data-nano-model-selector")?"model-trigger":t("data-nxe")?"files-row":t("data-nano-shared-workspace")?"shared-row":t("data-row-key")||t("data-sidebar-row")?"sidebar-row":e.tag==="TEXTAREA"?"composer-textarea":"other"}function q(e){return e==null?null:Math.round(e*10)/10}function rn(e,n){for(e.interactions.push(n);e.interactions.length>50;)e.interactions.shift()}function on(e,n,t){let a=e.start-1,i=e.start+e.duration+8,o={},u=w=>{let p=o[w];return p===void 0&&(p={spans:0,callbacks:0,spanMs:0,trackMs:0,spanAfterWindow:!1},o[w]=p),p},x=new Map;for(let w of n)if(w.start<=i&&w.end>=a){let p=u(w.pluginId);p.spans+=1,w.end>i&&(p.spanAfterWindow=!0);let c=Math.max(w.start,a),l=Math.min(w.end,i);if(l>c){let m=x.get(w.pluginId);m===void 0&&(m=[],x.set(w.pluginId,m)),m.push([c,l])}}for(let[w,p]of x){p.sort((g,N)=>g[0]-N[0]);let c=0,[l,m]=p[0];for(let g=1;g<p.length;g+=1){let[N,T]=p[g];N>m?(c+=m-l,l=N,m=T):T>m&&(m=T)}c+=m-l,u(w).spanMs=c}for(let w of t)if(w.at>=a&&w.at<=i){let p=u(w.pluginId);p.callbacks+=1,p.trackMs+=w.ms}return o}var Ta=e=>({n:e.n,windowN:e.window.length,p50:q(ce(e.window,.5)),p95:q(ce(e.window,.95)),maxMs:q(e.window.length===0?null:Math.max(...e.window))});function Ca(e,n){let t={},a=e?.plugins?.[n]?.spans;if(a==null)return t;for(let[i,o]of Object.entries(a)){let u=Array.isArray(o.samples)?o.samples:[];t[i]={n:o.n??u.length,p50:q(ce(u,.5)),p95:q(ce(u,.95))}}return t}function sn(e){let{collector:n,plugins:t,structure:a}=e,i=[],o=n.interactions.map(l=>l.duration),u=l=>q(ce(n.interactions.map(m=>m[l]).filter(m=>typeof m=="number"),.95)),x={nativeInpP75:q(ce(o,.75)),nativeInpCount:o.length,nativeInpDurationThreshold:16,inputDelayP95:u("inputDelay"),processingP95:u("processing"),presentationP95:u("presentation"),loafCount:n.loafCount,blockingMs:q(n.blockingMs),forcedLayoutMs:q(n.forcedLayoutMs),nanoCombined:{scriptMs:q(n.nanoScriptMs),loafCount:n.nanoLoafCount,blockingMs:q(n.nanoBlockingMs),clientJsBytes:n.resources.nanoClientJsBytes,comboResources:n.resources.comboResources},resources:{nanoClientJsBytes:n.resources.nanoClientJsBytes,totalJsBytes:n.resources.totalJsBytes}},w={};for(let[l,m]of t){let g=m.own.interactions,N={};for(let[B,z]of m.spans)N[B]=Ta(z);let T={};for(let[B,z]of m.tracks)T[B]={kind:z.kind,callbacks:z.callbacks,live:z.live,callbackMs:q(z.callbackMs),totalCallbacks:z.totalCallbacks??z.callbacks,totalCallbackMs:q(z.totalCallbackMs??z.callbackMs)};let D={};for(let[B,z]of m.usage)D[B]=z;w[l]={meta:{version:m.meta.version??null,implantedAt:m.meta.implantedAt??null,implanted:!0},own:{inpP75:q(ce(g,.75)),inpCount:g.length},native:{spanMsP95:q(ce(m.native.spanMs,.95)),trackMsP95:q(ce(m.native.trackMs,.95)),samples:{spans:m.samples.spans,callbacks:m.samples.callbacks}},spans:N,tracks:T,usage:D,hostSpan:Ca(e.hostSnapshot,l),profiler:{commits:m.profiler.commits,commitP95:q(ce(m.profiler.durations,.95))},scriptMs:q(n.pluginScriptMs.get(l)??0)}}let p={};for(let[l,m]of n.counts)p[l]=m;return n.interactions.some(l=>Object.values(l.samples??{}).some(m=>m.spanAfterWindow))&&i.push("spanAfterWindow: \u6709\u5F02\u6B65 span \u5728\u4EA4\u4E92\u7A97\u53E3\u7ED3\u675F\u540E\u624D settle\uFF0C\u4ECD\u6309\u8D77\u70B9\u5212\u5165\u8BE5\u7A97\u53E3\u3002"),n.nanoBlockingMs>0&&i.push("nanoBlockingMs \u6309\u6574\u6761 LoAF \u6761\u76EE\u5F52\u5E76\uFF1B\u542B\u975E nano \u811A\u672C\u7684\u5E27\u4F1A\u628A\u90A3\u90E8\u5206\u65F6\u95F4\u4E00\u5E76\u8BA1\u5165\u3002"),o.length>0&&o.length<8&&i.push(`nativeInpCount=${o.length} < 8\uFF1Ap75 \u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u4F5C\u9884\u7B97\u5224\u65AD\uFF1B\u8FD9\u4E0D\u662F web-vitals INP\u3002`),i.push("Event Timing \u4E09\u6BB5\uFF1AinputDelay=\u4E3B\u7EBF\u7A0B\u5FD9/\u6392\u961F\uFF0Cprocessing=\u4E8B\u4EF6\u5904\u7406\u5668\uFF0Cpresentation=\u7B49\u4E0B\u4E00\u6B21\u7ED8\u5236\u3002\u9875\u7EA7 nativeInpP75 \u542B presentation\uFF0C\u5C5E\u73AF\u5883\u7EA7\u8BFB\u6570\uFF0C\u4E0D\u6284\u8FDB\u63D2\u4EF6\u884C\uFF08spec \xA75.1\uFF09\uFF1B\u63D2\u4EF6\u9884\u7B97\u4EE5 inputDelayP95/processingP95 \u4E0E native.spanMsP95/trackMsP95 \u4E3A\u51C6\u3002"),i.push("lab \u7684 composer-type \u7528 CDP \u5408\u6210\u6309\u952E\uFF08page.keyboard.type\uFF09\uFF0C\u62AC\u8D77\u7684\u662F presentation \u6BB5\uFF1B\u8BFB\u6570\u6807\u6CE8\u4E3A synthetic input\uFF0C\u4E0D\u7B49\u540C\u771F\u5B9E\u7528\u6237 INP\u3002"),i.push("nanoCombined.scriptMs \u53EA\u7EDF\u8BA1 >50ms \u957F\u5E27\u91CC >5ms \u7684\u811A\u672C\u6761\u76EE\uFF0C\u4E0D\u662F\u603B\u811A\u672C\u8017\u65F6\uFF1B\u5FEB\u800C\u9891\u7E41\u7684\u811A\u672C\u5DE5\u4F5C\u4E0D\u53EF\u89C1\u3002"),i.push("nanoCombined.blockingMs \u628A\u300C\u542B\u4EFB\u4E00 nano \u811A\u672C\u300D\u7684\u6574\u6761 LoAF blockingDuration \u8BA1\u5165\uFF0C\u542B\u975E nano \u90E8\u5206\uFF0C\u5C5E\u8FC7\u5EA6\u5F52\u56E0\u3002"),i.push("nanoCombined.clientJsBytes \u662F\u6240\u6709 dsh-nano-* \u5305 combo \u7684 encodedBodySize \u5408\u8BA1\uFF0C\u4E0D\u662F\u5355\u4E2A\u63D2\u4EF6\u7684\u4F53\u79EF\u3002"),n.pluginScriptMs.size===0&&i.push("\u9010\u5305 scriptMs \u5168\u4E3A 0\uFF1Acombo URL \u542B\u591A\u4E2A\u5305\u540D\uFF0C\u5355\u5305 URL \u6781\u5C11\u51FA\u73B0\uFF1B\u6309 \xA73.1 \u4E0D\u4E88\u62C6\u5206\u3002"),{version:1,meta:{generatedAt:e.meta?.generatedAt??null,scenario:e.meta?.scenario??null,arm:e.meta?.arm??"on",dshVersion:e.meta?.dshVersion??null,chromeMajor:e.meta?.chromeMajor??null,observerVersion:e.meta?.observerVersion??null,contributors:e.meta?.contributors??[],gitSha:e.meta?.gitSha??null,labels:e.meta?.labels??{}},enabled:e.enabled===!0,loafSupported:e.loafSupported!==!1,page:x,plugins:w,counts:p,structure:{...a},notes:i}}function ln(e,n){if(n==null||typeof n!="object")return e;for(let[t,a]of Object.entries(e.plugins??{})){let i=n.plugins?.[t]?.spans;if(i==null)continue;let o={...a.hostSpan??{}};for(let[u,x]of Object.entries(i)){let w=Array.isArray(x.samples)?x.samples:[];o[u]={n:x.n??w.length,p50:q(ce(w,.5)),p95:q(ce(w,.95))}}a.hostSpan=o}return e.structure={...e.structure??{},hostWriteErrors:(e.structure?.hostWriteErrors??0)+(n.structure?.hostWriteErrors??0)},e.meta={...e.meta??{},hostSinceStart:n.sinceStart??null,hostWrittenAt:n.writtenAt??null,hostEnabled:n.enabled??null,hostWindow:n.window===!0},e}var Ra=4096,$a=4096,Oa=128,he=e=>e.now(),Ma=e=>e!==null&&typeof e=="object"&&typeof e.then=="function";function Da(e){if(e.forceEnabled!==void 0)return e.forceEnabled===!0;try{if(e.localStorage?.getItem?.("dsh-perf-review")==="1")return!0}catch{}try{let n=e.location?.search??"";if(/(?:^|[?&])perf-review=1(?:&|$)/.test(n))return!0}catch{}return!1}function Ba(e,n){let t=e,a=0;for(;t!=null&&typeof t=="object"&&a<12;){let i={tag:t.tagName,attrs:{}};for(let u of n)try{typeof t.hasAttribute=="function"&&t.hasAttribute(u)&&(i.attrs[u]=!0)}catch{}let o=Ze(i);if(o!=="other")return o;t=t.parentElement??null,a+=1}return Ze({tag:e?.tagName,attrs:{}})}var Ia=["data-composer","data-chat-input","data-nano-notepad","data-nano-model-selector","data-nxe","data-nano-shared-workspace","data-row-key","data-sidebar-row"],cn='[hidden],[aria-hidden="true"]';function Pa(e,n=null){if(e==null||typeof e!="object"||e.isConnected===!1||e.hidden===!0)return!1;try{if(typeof e.closest=="function"&&e.closest(cn)!==null)return!1}catch{}if(n!=null){if(n.hidden===!0)return!1;try{if(typeof n.closest=="function"&&n.closest(cn)!==null)return!1}catch{}}return!0}function un(e,n=null){for(let t of e??[]){let a=n===null?null:n(t);if(Pa(t,a))return t}return null}var dn=(e,n)=>e==null||n==null?!1:e===n?!0:typeof e.contains=="function"?e.contains(n):!1;function Aa(e,n,t){let a=null;for(let[i,o]of e){if(typeof o._root!="function")continue;let u;try{u=o._root()}catch{t.rootErrors+=1;continue}if(u==null)continue;let x=!1;try{x=dn(u,n)}catch{t.rootErrors+=1;continue}if(x){if(a===null){a={pluginId:i,root:u};continue}try{dn(a.root,u)&&u!==a.root&&(a={pluginId:i,root:u})}catch{t.rootErrors+=1}}}return a?.pluginId??"native"}function za(e={}){let n=e.performance??globalThis.performance,t=Qt(),a=new Map,i=[],o=vt();if(e.localStorage===void 0)try{typeof localStorage<"u"&&(e={...e,localStorage})}catch{}if(e.location===void 0)try{typeof location<"u"&&(e={...e,location})}catch{}let u=e.forceEnabled!==void 0?e.forceEnabled===!0:null,x=null,w=!0,p=e.hostSnapshotProvider??null,c=null,l=null,m=null;o.startedAt=he(n);let g=(b,E,y)=>{for(b.push(y);b.length>E;)b.shift()},N=b=>{let E=b.startTime??0,y=b.duration??0,v=typeof b.processingStart=="number"&&b.processingStart>0?b.processingStart:E,_=typeof b.processingEnd=="number"&&b.processingEnd>=v?b.processingEnd:v;return{inputDelay:Math.max(0,v-E),processing:Math.max(0,_-v),presentation:Math.max(0,y-(_-E))}},T=b=>{let E=b.interactionId??0;if(E===0)return;let y=String(E),v=o.pendingInteractions.get(y);if(v===void 0){v={interactionId:E,start:b.startTime,duration:b.duration??0,target:b.target??null,...N(b)},o.pendingInteractions.set(y,v);return}v.start=Math.min(v.start,b.startTime),(b.duration??0)>=v.duration&&(v.duration=b.duration??0,v.target=b.target??v.target,Object.assign(v,N(b)))},D=b=>{for(let[y,v]of o.pendingInteractions){if(v.start+v.duration+8>b)continue;o.pendingInteractions.delete(y);let A=Aa(a,v.target,t),P=Ba(v.target,Ia),ge=on(v,o.spanEvents,o.trackEvents);rn(o,{interactionId:v.interactionId,start:v.start,duration:v.duration,inputDelay:v.inputDelay??0,processing:v.processing??0,presentation:v.presentation??0,owner:A,bucket:P,samples:ge});let re=a.get(A);if(re!==void 0&&A!=="native"){re.own.interactions.push(v.duration);continue}for(let[se,ye]of Object.entries(ge)){let pe=a.get(se);pe!==void 0&&(pe.samples.spans+=ye.spans,pe.samples.callbacks+=ye.callbacks,ye.spanMs>0&&pe.native.spanMs.push(ye.spanMs),ye.trackMs>0&&pe.native.trackMs.push(ye.trackMs))}}let E=he(n)-6e4;o.spanEvents=o.spanEvents.filter(y=>y.end>=E),o.trackEvents=o.trackEvents.filter(y=>y.at>=E)},B=b=>{o.loafCount+=1,o.blockingMs+=b.blockingDuration??0;let E=!1;for(let y of b.scripts??[]){o.forcedLayoutMs+=y.forcedStyleAndLayoutDuration??0;let v=yt(y.sourceURL??"");if(v.length!==0)if(E=!0,v.length===1){let _=an(v[0]);_!==null&&o.pluginScriptMs.set(_,(o.pluginScriptMs.get(_)??0)+(y.duration??0))}else o.nanoScriptMs+=y.duration??0}E&&(o.nanoLoafCount+=1,o.nanoBlockingMs+=b.blockingDuration??0)},z=b=>{let E=b.name??"";if(!(b.initiatorType==="script"||/\.js(?:[?&]|$)/.test(E)))return;let v=b.encodedBodySize??0;o.resources.totalJsBytes+=v,yt(E).length!==0&&(o.resources.nanoClientJsBytes+=v,E.includes("/plugins/??")&&(o.resources.comboResources+=1))},M=()=>{if(x!==null)return;x={installed:!0};let b=e.PerformanceObserver??globalThis.PerformanceObserver;if(typeof b!="function"){w=!1,t.observerErrors+=1;return}let E=(y,v)=>{try{let _=new b(A=>{try{for(let P of A.getEntries())v(P);D(he(n))}catch{t.observerErrors+=1}});return _.observe({type:y,buffered:!0,durationThreshold:16}),_}catch{return t.observersMissing+=1,null}};x.event=E("event",T),x.loaf=E("long-animation-frame",B),x.loaf===null&&(w=!1),x.resource=E("resource",z),x.event===null&&x.loaf===null&&x.resource===null&&(t.observerErrors+=1)},C=()=>{if(m!==null)return;let b=e.setInterval??globalThis.setInterval;typeof b=="function"&&(m=b(()=>{try{D(he(n))}catch{t.observerErrors+=1}},250),typeof m?.unref=="function"&&m.unref())},j=()=>(u===null&&(u=Da(e)),u===!0&&x===null&&(M(),C()),u),H=(b,E,y,v,_)=>{let A=en(b,t,y);if(A!==null){Xt(A,_-v),g(o.spanEvents,$a,{start:v,end:_,pluginId:E,name:y});try{n.measure?.(`nano:${E}:${y}`,{start:v,end:_})}catch{}}},Z=(b,E)=>({span(y,v){if(!We.test(y))return t.badNames+=1,v();let _=he(n),A;try{A=v()}catch(P){throw H(E,b,y,_,he(n)),P}return Ma(A)?A.finally(()=>H(E,b,y,_,he(n))):(H(E,b,y,_,he(n)),A)},track(y,v,_={}){let A=nn(E,t,v,y);return{name:v,kind:y,wrap(P){return A===null?P:(...ge)=>{let re=he(n);try{return P(...ge)}finally{let se=he(n)-re;A.callbacks+=1,A.totalCallbacks=(A.totalCallbacks??0)+1,A.callbackMs+=se,A.totalCallbackMs=(A.totalCallbackMs??0)+se,g(o.trackEvents,Ra,{at:re,ms:se,pluginId:b,name:v})}}},attach(P=1){A!==null&&(A.live+=P)},detach(P=1){A!==null&&(A.live=Math.max(0,A.live-P))},resetLive(){A!==null&&(A.live=0)}}},count(y,v=1){tn(E,t,y,v)&&o.counts.set(y,(o.counts.get(y)??0)+v)},profiler(y){let v=E._react;if(v==null||typeof v.Profiler!="function")return y;let _=(...A)=>{let P=A[2];for(E.profiler.commits+=1,E.profiler.durations.push(P??0);E.profiler.durations.length>Oa;)E.profiler.durations.shift()};return function(P){return v.createElement(v.Profiler,{id:`nano:${b}:root`,onRender:_},v.createElement(y,P))}}}),d=()=>({span(b,E){return E()},track(b,E){return{name:E,kind:b,wrap:y=>y,attach(){},detach(){},resetLive(){}}},count(){},profiler(b){return b}}),S=(b,E={})=>{j();let y=Zt(a,b);return i.push({pluginId:b,libVersion:E.libVersion??ze}),E.version!=null&&(y.meta.version=E.version),y.meta.implantedAt==null&&(y.meta.implantedAt=new Date().toISOString()),typeof E.root=="function"&&(y._root=E.root),E.react!=null&&(y._react=E.react),u?Z(b,y):d()},$=()=>{let b=o.counts,E=o.resources;o=vt(),o.counts=b,o.resources=E,o.startedAt=he(n);for(let y of a.values()){y.own.interactions=[],y.native.spanMs=[],y.native.trackMs=[],y.samples={spans:0,callbacks:0};for(let v of y.spans.values())v.window=[];for(let v of y.tracks.values())v.callbacks=0,v.callbackMs=0;y.profiler.durations=[]}};return{join:S,report:(b={},E=null)=>{D(he(n)+6e4);let y=[],v=new Set;for(let re of i){let se=`${re.pluginId}@${re.libVersion}`;v.has(se)||(v.add(se),y.push(re))}let _=e.navigator??globalThis.navigator,A=/Chrome\/(\d+)/.exec(_?.userAgent??""),P=E??(typeof p=="function"?p():c),ge=sn({meta:{generatedAt:new Date().toISOString(),chromeMajor:A===null?null:Number(A[1]),observerVersion:ze,contributors:y,...b},collector:o,plugins:a,structure:t,hostSnapshot:P??null,enabled:u===!0,loafSupported:w});return P!=null&&ln(ge,P),$(),ge},configure:(b={})=>{if(typeof b.hostSnapshotProvider=="function"){p=b.hostSnapshotProvider;return}if(typeof b.hostSnapshotUrl!="string"||p!==null||l!==null||u!==!0)return;let E=e.fetch??globalThis.fetch,y=e.setInterval??globalThis.setInterval;if(typeof E!="function"||typeof y!="function")return;let v=()=>{try{Promise.resolve(E(b.hostSnapshotUrl,{credentials:"same-origin",cache:"no-store"})).then(_=>_?.json?.()).then(_=>{_!==null&&typeof _=="object"&&(c=_)}).catch(()=>{})}catch{}};v(),l=y(v,5e3),typeof l?.unref=="function"&&l.unref()},setHostSnapshotProvider:b=>{p=typeof b=="function"?b:null},reset:$,resetCounters:()=>{o.counts.clear();for(let b of a.values())b.usage.clear()},_state:()=>({collector:o,plugins:a,structure:t,enabled:u,loafSupported:w,contributors:i}),_finalizeDue:D,_absorbEventEntry:T,_absorbLoafEntry:B,_absorbResourceEntry:z,libVersion:ze}}function et(e={}){let n=e.global??globalThis;return n.__perfReview==null&&(n.__perfReview=za(e)),n.__perfReview}typeof window<"u"&&typeof document<"u"&&et();var La="nano-explorer-extra",Fa=()=>un(document.querySelectorAll("[data-nxe]")),te=et().join(La,{version:"0.1.1",libVersion:ze,react:pn.default,root:Fa});et().configure({hostSnapshotUrl:"/nano-explorer-extra/perf-review/host?mode=snapshot"});var{useState:fn}=ie.default;function Le(e){return tt(),ie.default.useEffect(()=>{te.count("dialog-open")},[]),ie.default.createElement(Ce,e)}function tt(e=!0){ie.default.useEffect(()=>{if(!e)return;let n=!0,t=(M,C)=>{for(let[j,H]of Object.entries(C))M.style[j]!==H&&(M.style[j]=H)},a=()=>{let M=null,C=0;for(let j of document.querySelectorAll("[data-nxe]")){let H=j.closest("[data-sidebar-right-pane]")??j;if(!(H instanceof HTMLElement))continue;let Z=H.getBoundingClientRect(),d=Z.width*Z.height;d>C&&(M=H,C=d)}return M},i=null,o=null,u=()=>document.querySelector('.nano-dialog-card [class*="nxe-"]')!==null,x=()=>{if(!n||!u())return;let M=a();if(!(M instanceof HTMLElement))return;M!==i&&typeof ResizeObserver=="function"&&(o?.disconnect(),i=M,o=new ResizeObserver(x),o.observe(M));let C=M.getBoundingClientRect();if(!(C.width<1||C.height<1))for(let j of document.querySelectorAll(".nano-dialog-card")){if(j.querySelector('[class*="nxe-"]')===null)continue;let H=j.parentElement;if(H instanceof HTMLElement&&(H.classList.add("nxe-confined-layer"),t(H,{position:"fixed",top:`${C.top}px`,left:`${C.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${C.width}px`,height:`${C.height}px`,padding:"12px"}),j.querySelector(".nxe-scm")!==null)){j.dataset.nxeFill="1";let Z=M.getAttribute("data-theme");Z&&j.setAttribute("data-theme",Z),t(H,{display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",overflow:"hidden"}),t(j,{position:"relative",top:"auto",left:"auto",right:"auto",transform:"none"});let d=j.querySelector("[data-nxe-scm]")?.getAttribute("data-nxe-scm"),S=Math.max(240,C.height-24);if(d==="commit"){let $=`${Math.min(Math.round(window.innerHeight*.5),S)}px`;t(j,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:$,minHeight:$,maxHeight:$,display:"flex",flexDirection:"column",overflow:"hidden"})}else t(j,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:"auto",minHeight:"0",maxHeight:`${Math.min(S,Math.round(C.height*.68))}px`,display:"",flexDirection:"",overflow:""})}}},w=null,p=0,c=!1,l=te.track("mutation","card-shape"),m=te.track("raf","card-follow"),g=te.track("mutation","card-wake"),N=()=>{c&&(l.detach(),m.detach(),c=!1),w!==null&&(w.disconnect(),w=null),p!==0&&(window.cancelAnimationFrame(p),p=0),o?.disconnect(),o=null,i=null,window.removeEventListener("resize",x)},T=M=>{for(let C of M)for(let j of C.addedNodes)if(j instanceof Element&&(j.matches(".nano-dialog-card, .nano-dialog-card *")||j.querySelector(".nano-dialog-card")!==null))return!0;return!1},D=m.wrap(()=>{if(p=0,!!n){if(!u()){N();return}x(),p=window.requestAnimationFrame(D)}}),B=()=>{c||!n||!u()||(c=!0,w=new MutationObserver(l.wrap(M=>{T(M)&&x()})),w.observe(document.body,{childList:!0,subtree:!0}),l.attach(),m.attach(),window.addEventListener("resize",x),x(),p=window.requestAnimationFrame(D))},z=new MutationObserver(g.wrap(M=>{!n||c||!T(M)||B()}));return z.observe(document.body,{childList:!0,subtree:!0}),g.attach(),B(),()=>{n=!1,N(),z.disconnect(),g.detach();for(let M of document.querySelectorAll(".nxe-confined-layer")){M.classList.remove("nxe-confined-layer");for(let C of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction","overflow"])M.style.removeProperty(C)}for(let M of document.querySelectorAll("[data-nxe-fill]"))if(M instanceof HTMLElement){delete M.dataset.nxeFill;for(let C of["width","max-width","height","max-height","min-height","min-width","margin","position","top","left","right","transform","display","flex-direction","overflow"])M.style.removeProperty(C)}}},[e])}function hn({children:e}){return ie.default.createElement("div",{className:"nxe-dialog-field"},e)}function mn({copy:e,files:n,busy:t,error:a,onConfirm:i,onCancel:o}){let[u,x]=fn(""),w=u.trim()==="";return ie.default.createElement(Le,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:w,busy:t,error:a,onConfirm:()=>i(u),onCancel:o,description:e.commitBody(n.length)},ie.default.createElement(hn,null,ie.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(p=>ie.default.createElement("li",{key:p.path,title:p.path},`${p.status} ${p.path}`))),ie.default.createElement(St.Input,{value:u,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:p=>x(p.currentTarget.value)})))}function Nt({copy:e,currentName:n,busy:t,error:a,onConfirm:i,onCancel:o,mode:u="rename"}){let[x,w]=fn(n),p=x.trim()==="",c=u==="create";return ie.default.createElement(Le,{copy:e,title:c?e.newEntryTitle:e.renameTitle,confirmLabel:c?e.create:e.confirm,busy:t,error:a,confirmDisabled:p,onConfirm:()=>i(x),onCancel:o,description:c?e.newEntryBody(n):e.renameBody(n)},ie.default.createElement(hn,null,ie.default.createElement(St.Input,{value:x,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:l=>w(l.currentTarget.value),onKeyDown:l=>{l.key==="Enter"&&!p&&(l.preventDefault(),i(x))}})))}var h=oe(J("react"),1),Y=J("@deepseek-ai/dsh-client-ui-primitives");function Ve(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,a=0;for(;t>=1024&&a<n.length-1;)t/=1024,a+=1;return`${a===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[a]}`}function gn(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function xn(e){let n=[],t=[],a=[],i=[];for(let o of e??[]){if(o?.status==="U"){i.push(o);continue}if(o?.status==="?"){a.push(o);continue}o?.staged&&n.push({...o,status:o.staged}),o?.unstaged?t.push({...o,status:o.unstaged}):o?.staged||t.push(o)}return{staged:n,unstaged:t,untracked:a,conflicts:i}}function wn(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function Tt(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function bn(e,n,t){let a=new Map(e),i=n===""?"":`${n}/`;for(let o of a.keys())(i===""||o===n||o.startsWith(i))&&a.delete(o);for(let o of t)typeof o?.path=="string"&&o.path!==""&&a.set(o.path,o);return a}function vn(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let a=Math.floor(t/60);if(a<24)return{unit:"hours",value:a};let i=Math.floor(a/24);if(i<30)return{unit:"days",value:i};let o=new Date(e*1e3),u=x=>String(x).padStart(2,"0");return{unit:"date",value:`${o.getFullYear()}-${u(o.getMonth()+1)}-${u(o.getDate())}`}}var{useEffect:kn,useState:nt}=h.default;function _a(e,n){let t=vn(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function En(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function yn(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(a=>String(a??"").toLowerCase().includes(t))}function Ua({file:e}){let{name:n,dir:t}=wn(e.path);return h.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},h.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),h.default.createElement(Y.FileTypeIcon,{kind:(0,Y.classifyFileType)(n),size:16,className:"nxe-change-icon"}),h.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:h.default.createElement("span",{className:"nxe-change-dir"},t)))}function Ct({label:e,count:n,files:t,tone:a}){return t.length===0?null:h.default.createElement("section",{className:"nxe-scm-group","data-tone":a??"default"},h.default.createElement("h3",{className:"nxe-local-head","data-tone":a??"default"},h.default.createElement("span",null,e),h.default.createElement("span",{className:"nxe-local-badge"},String(n))),h.default.createElement("ul",{className:"nxe-drawer-list"},t.slice(0,400).map(i=>h.default.createElement(Ua,{key:`${a??""}:${i.path}`,file:i}))))}function Ha({copy:e,history:n,currentBranch:t,upstream:a}){let i=n??[],o=a==null?-1:i.findIndex(u=>u.refs.includes(a));return h.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},h.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),i.length===0?h.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):h.default.createElement("ol",{className:"nxe-graph"},i.map((u,x)=>h.default.createElement("li",{key:`${u.hash}:${x}`,className:"nxe-graph-row","data-head":String(x===0),"data-ahead":String(o>=0&&x<o||o===-1&&a!=null),"data-boundary":String(o>=0&&x===o),title:[u.hash,_a(e,u.time),u.subject].filter(w=>w!=="").join(" \xB7 ")},h.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},h.default.createElement("span",{className:"nxe-graph-dot"})),h.default.createElement("span",{className:"nxe-graph-subject"},h.default.createElement("span",{className:"nxe-graph-hash"},u.hash)," ",u.subject),h.default.createElement("span",{className:"nxe-graph-pills"},u.refs.slice(0,2).map(w=>h.default.createElement("span",{key:w,className:"nxe-pill","data-tone":w===t?"current":w===a?"upstream":"default",title:w},w)))))))}function Sn({copy:e,open:n,git:t,onClose:a,onPull:i,onRefresh:o,onCheckout:u,onOpenConflict:x,busy:w,error:p}){tt(n);let[c,l]=nt(""),[m,g]=nt(null);if(kn(()=>{n||(l(""),g(null))},[n]),!n)return null;let N=En(t),T=t?.upstream??null,D=t?.behind??0,B=t?.ahead??0,z=t?.history??[],M=[...t?.branches??[]].sort((d,S)=>d.current===!0&&S.current!==!0?-1:S.current===!0&&d.current!==!0?1:d.name.localeCompare(S.name)).filter(d=>yn(c,[d.name,d.upstream,d.commit])),C=(t?.worktrees??[]).filter(d=>yn(c,[d.branch,d.path,d.head,Tt(d.path)])),j=c.trim()!==""&&M.length===0&&C.length===0,H=t?.conflicts??[],Z=e.branchDrawerSummary(N??e.detached,T===null?e.noUpstream:`${T} \xB7 ${e.factSyncValue(D,B)}`,e.worktreesHeadingCount((t?.worktrees??[]).length));return h.default.createElement(Ce,{copy:e,title:e.branchDrawerTitle,description:H.length===0?Z:`${Z} \xB7 ${e.factConflicted(H.length)}`,error:p,footer:h.default.createElement(h.default.Fragment,null,h.default.createElement(Y.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:a},e.cancel),h.default.createElement(Y.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{o()}},e.refreshGit),T===null?null:h.default.createElement(Y.Button,{variant:"primary",className:"nano-modal-action",disabled:w===!0||D===0,title:D===0?e.pullNothing:e.pullNow,onClick:()=>{i()}},D>0?`${e.pullNow} ${D}`:e.pullNow)),onCancel:a},h.default.createElement("div",{className:"nxe-scm nxe-repo","data-nxe-scm":"branch"},H.length===0?null:h.default.createElement("section",{className:"nxe-repo-conflict","data-nxe-conflicts":String(H.length)},h.default.createElement("p",{className:"nxe-repo-conflict-title"},h.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!")," ",e.factConflicted(H.length)),h.default.createElement("p",{className:"nxe-drawer-empty"},e.branchConflictBlocks),h.default.createElement("ul",{className:"nxe-drawer-list nxe-repo-conflict-list"},H.map(d=>h.default.createElement("li",{key:d,className:"nxe-change","data-status":"U"},h.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),h.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:d,onClick:()=>x?.(d)},d))))),h.default.createElement(Ha,{copy:e,history:z,currentBranch:N,upstream:T}),h.default.createElement(Y.Input,{value:c,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:d=>l(d.currentTarget.value)}),j?h.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):h.default.createElement(h.default.Fragment,null,h.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(M.length)),M.length===0?h.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):h.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},M.map(d=>h.default.createElement("li",{key:d.name,className:"nxe-drawer-row","data-current":String(d.current===!0),"data-blocked":String(d.inOtherWorktree===!0)},h.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:d.current===!0||d.inOtherWorktree===!0||w===!0||H.length>0,title:H.length>0?e.branchConflictBlocks:d.inOtherWorktree===!0?e.branchHeldElsewhere:d.name,onClick:()=>g(d.name),"data-nxe-checkout":d.name},d.name),d.commit===""?null:h.default.createElement("span",{className:"nxe-graph-hash"},d.commit),d.upstream===null?null:h.default.createElement("span",{className:"nxe-drawer-row-path",title:d.upstream},d.upstream),H.length>0&&d.current===!0?h.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"danger"},"!"):null,d.inOtherWorktree===!0?h.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):d.current===!0?h.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),h.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(C.length)),C.length===0?h.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):h.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},C.map(d=>{let S=d.path===t?.root,$=d.detached?e.detached:d.branch??e.detached,F=typeof d.head=="string"?d.head.slice(0,7):"";return h.default.createElement("li",{key:d.path,className:"nxe-worktree","data-current":String(S),title:d.path},h.default.createElement("span",{className:"nxe-worktree-mark","data-current":String(S),"aria-hidden":"true"}),h.default.createElement("span",{className:"nxe-worktree-body"},h.default.createElement("span",{className:"nxe-worktree-line"},h.default.createElement("span",{className:"nxe-worktree-branch"},$),F===""?null:h.default.createElement("span",{className:"nxe-graph-hash"},F),S?h.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),h.default.createElement("span",{className:"nxe-worktree-path"},Tt(d.path))))})))),m===null?null:h.default.createElement(Le,{copy:e,title:e.checkoutTitle(m),description:e.checkoutBody(m),confirmLabel:e.checkoutConfirm,busy:w,onConfirm:()=>{let d=m;g(null),u(d)},onCancel:()=>g(null)},h.default.createElement("p",{className:"nxe-drawer-empty"},e.checkoutBody(m))))}function Nn({copy:e,open:n,git:t,onClose:a,onCommit:i,busy:o,error:u,refreshing:x,onOpenConflict:w}){tt(n);let[p,c]=nt(""),[l,m]=nt("all");if(kn(()=>{n||m("all")},[n]),!n)return null;let g=t?.files??[],N=xn(g),T=N.conflicts.length>0?N.conflicts:(t?.conflicts??[]).map(C=>({path:C,status:"U"})),D=g.length,B=En(t),z=D>0&&T.length===0&&p.trim()!==""&&o!==!0,M=()=>{z&&Promise.resolve(i(p)).then(C=>{C===!0&&c("")})};return h.default.createElement(Ce,{copy:e,title:h.default.createElement("span",{className:"nxe-drawer-title"},e.commitDrawerTitle,x===!0?h.default.createElement(Y.IconLoadingOutlineRegular,{width:15,height:15,className:"nxe-drawer-spin","aria-label":e.commitRefreshing??"refreshing",role:"status"}):null),description:e.commitDrawerBody(D,B??(t?.detached?e.detached:null)),error:u,footer:h.default.createElement(h.default.Fragment,null,h.default.createElement(Y.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:a},e.cancel),h.default.createElement(Y.Button,{variant:"primary",className:"nano-modal-action",disabled:!z,onClick:M},e.commit)),onCancel:a},h.default.createElement("div",{className:"nxe-scm nxe-local","data-nxe-scm":"commit"},h.default.createElement(Y.Input,{value:p,placeholder:B===null?e.commitPlaceholder:e.commitPlaceholderOn(B),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:C=>c(C.currentTarget.value),onKeyDown:C=>{C.key==="Enter"&&(C.metaKey||C.ctrlKey)&&(C.preventDefault(),M())}}),h.default.createElement("div",{className:"nxe-local-filters",role:"group","aria-label":e.filterChanges},[{id:"all",label:e.filterAll,count:D},{id:"staged",label:e.localStaged,count:N.staged.length},{id:"unstaged",label:e.localUnstaged,count:N.unstaged.length},{id:"untracked",label:e.localUntracked,count:N.untracked.length},...T.length===0?[]:[{id:"conflict",label:e.localConflicts,count:T.length}]].map(C=>h.default.createElement(Y.Button,{key:C.id,variant:l===C.id?"primary":"outline",className:"nxe-local-filter",disabled:C.id!=="all"&&C.count===0,"aria-pressed":String(l===C.id),onClick:()=>m(C.id)},`${C.label} ${C.count}`))),l!=="all"&&l!=="conflict"||T.length===0?null:h.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},h.default.createElement("h3",{className:"nxe-local-head","data-tone":"danger"},h.default.createElement("span",null,e.localConflicts),h.default.createElement("span",{className:"nxe-local-badge"},String(T.length))),h.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),h.default.createElement("ul",{className:"nxe-drawer-list"},T.map(C=>h.default.createElement("li",{key:C.path,className:"nxe-change","data-status":"U"},h.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),h.default.createElement(Y.FileTypeIcon,{kind:(0,Y.classifyFileType)(C.path),size:16,className:"nxe-change-icon"}),h.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:C.path,onClick:()=>w(C.path)},C.path))))),D===0?h.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):h.default.createElement(h.default.Fragment,null,l==="all"||l==="staged"?h.default.createElement(Ct,{label:e.localStaged,count:N.staged.length,files:N.staged,tone:"staged"}):null,l==="all"||l==="unstaged"?h.default.createElement(Ct,{label:e.localUnstaged,count:N.unstaged.length,files:N.unstaged,tone:"unstaged"}):null,l==="all"||l==="untracked"?h.default.createElement(Ct,{label:e.localUntracked,count:N.untracked.length,files:N.untracked,tone:"untracked"}):null)))}var Q=oe(J("react"),1),Mn=J("@deepseek-ai/dsh-client-ui-primitives");var Cn="dsh-nano-explorer-extra:prefs.v2",ja="dsh-nano-explorer-extra:prefs.v1",Fe={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function Rn(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Tn(e){let n=Rn(e)?e:{},t={};for(let[a,i]of Object.entries(Fe))t[a]=typeof n[a]=="boolean"?n[a]:i;return t}function $n(){try{let e=window.localStorage?.getItem(Cn);if(e!=null)return Tn(JSON.parse(e));let n=window.localStorage?.getItem(ja);if(n==null)return{...Fe};let t=JSON.parse(n),a=Rn(t)?{...t}:{};return delete a.openPreviewOnClick,delete a.openPreviewOnDoubleClick,Tn(a)}catch{return{...Fe}}}function On(e){try{window.localStorage?.setItem(Cn,JSON.stringify(e))}catch{}}function Re({label:e,hint:n,checked:t,onChange:a,warn:i}){return Q.default.createElement("div",{className:"nxe-settings-row"},Q.default.createElement("div",null,Q.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:Q.default.createElement("div",{className:"nxe-settings-hint"},n),i===!0?Q.default.createElement("p",{className:"nxe-warn"},n):null),Q.default.createElement(Mn.Switch,{checked:t,label:e,onChange:a}))}function Dn({copy:e,open:n,prefs:t,setPref:a,onClose:i}){if(!n)return null;let o=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return Q.default.createElement(Ce,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:i,onConfirm:i},Q.default.createElement(Re,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:u=>a("openPreviewOnClick",u)}),Q.default.createElement(Re,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:u=>a("openPreviewOnDoubleClick",u)}),o?Q.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,Q.default.createElement(Re,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:u=>a("showOpenButton",u)}),Q.default.createElement(Re,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:u=>a("showIgnoredBadge",u)}),Q.default.createElement(Re,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:u=>a("showGitStatus",u)}),Q.default.createElement(Re,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:u=>a("showSystemFiles",u)}),Q.default.createElement(Re,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:u=>a("showStatusBar",u)}),Q.default.createElement(Re,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:u=>a("statsExcludeGit",u)}))}var we=oe(J("react"),1),_e=J("@deepseek-ai/dsh-client-ui-primitives");function Bn(e){return function({entry:t}){let a=e.copy(),i=e.statusOf(t.path),o=e.ignoredOf(t.path),u=e.linkOf(t.path),x=e.linkBrokenOf(t.path)===!0,w=t.meta?.kind!=="directory",p=w?void 0:e.folderStatusOf(t.path),c=e.showGit()&&!o,l=c?e.stagedOf(t.path):void 0,m=c?e.unstagedOf(t.path):void 0,g=c?e.remoteOf(t.path):void 0;return we.default.createElement("span",{className:"nxe-acc",...o?{"data-nxe-ignored":"true"}:{}},u===void 0?null:we.default.createElement("span",{className:"nxe-acc-link",title:x?a.linkBroken:u?a.symlinkOutsideBadge:a.symlinkBadge,"aria-label":x?a.linkBroken:u?a.symlinkOutsideBadge:a.symlinkBadge,"data-nxe-symlink":x?"broken":u?"outside":"inside"},we.default.createElement(_e.IconLinkOutlineRegular,{width:14,height:14,"aria-hidden":"true"})),g===void 0?null:we.default.createElement("span",{className:"nxe-acc-remote","data-status":g.status,"data-direction":g.direction,title:g.direction==="pulled"?a.remotePulled(g.status):a.remotePushed(g.status),"aria-label":g.direction==="pulled"?a.remotePulled(g.status):a.remotePushed(g.status)},`${g.direction==="pulled"?"\u2193":"\u2191"}${g.status}`),c&&i!==void 0?we.default.createElement("span",{className:"nxe-acc-letter","data-status":i,"data-staged":l===void 0?"false":"true",title:e.statusLabel(i,l,m),"aria-label":e.statusLabel(i,l,m)},i):null,c&&p!==void 0?we.default.createElement("span",{className:"nxe-acc-dot","data-status":p,title:e.statusLabel(p),"aria-label":e.statusLabel(p)}):null,o&&e.showIgnoredBadge()?we.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:a.ignoredBadge,"aria-label":a.ignoredBadge},we.default.createElement(_e.IconCloseCircleFillRegular,{width:14,height:14,"aria-hidden":"true"})):null,w&&e.showOpenButton()?we.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:a.openFile,"aria-label":`${a.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:N=>{N.stopPropagation(),e.open(t)}},we.default.createElement(_e.IconRightUpOutlineRegular,{width:12,height:12,"aria-hidden":"true"})):null)}}var L=oe(J("react"),1);var ne=J("@deepseek-ai/dsh-client-ui-primitives");function Rt({icon:e,value:n,title:t,scope:a}){return L.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":a},e,L.default.createElement("span",{className:"nxe-figure-value"},n))}function In(e){let{copy:n,git:t,stats:a,statsState:i,prefs:o,onOpenBranch:u,onOpenCommit:x}=e,w=(0,L.useRef)(null),[p,c]=(0,L.useState)(!1),l=(0,L.useRef)(0);if((0,L.useEffect)(()=>{let N=w.current;if(!N)return;let T=()=>{let B=N.clientWidth;N.scrollWidth>B+1?(l.current=N.scrollWidth,c(!0)):p&&B>=l.current+32&&c(!1)};T();let D=new ResizeObserver(T);return D.observe(N),()=>D.disconnect()},[p]),!o.showStatusBar)return null;let m=[];if(t==null)m.push(L.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},L.default.createElement(ne.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),L.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let N=t.detached?n.detached:t.branch??n.detached,T=t.files?.length??0,D=t.conflicts?.length??0,B=T>0;m.push(L.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(B),"data-conflicted":String(D>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(N,B,D),"aria-label":n.branchButtonTooltip(N,B,D),onClick:u},L.default.createElement(ne.IconBranchOutlineRegular,{width:14,height:14}),L.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},N),B?L.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,D>0?L.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&m.push(L.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},L.default.createElement(ne.IconArchiveOutlineRegular,{width:14,height:14}),L.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let z=t.upstream===null||t.upstream===void 0?void 0:gn(t.ahead??0,t.behind??0);m.push(L.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(T),title:n.commitButtonTooltip(T,z===void 0?null:z),"aria-label":n.commitButtonTooltip(T,z===void 0?null:z),onClick:x},L.default.createElement(ne.IconRefreshOutlineRegular,{width:14,height:14}),z===void 0?null:L.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},z),L.default.createElement("span",{className:"nxe-chip-badge","data-nxe-pending":String(T),"data-empty":String(T===0)},String(T))))}let g=[];if(!p){if(i==="loading")g.push(L.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(i==="failed")g.push(L.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(a!=null){let N=a.truncated?"+":"",T=o.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";g.push(L.default.createElement(Rt,{key:"dirs",scope:"directories",icon:L.default.createElement(ne.IconFolderCloseRegular,{width:14,height:14}),value:`${a.directories}${N}`,title:n.statsTooltip(a.files,a.directories,Ve(a.bytes))+T})),g.push(L.default.createElement(Rt,{key:"files",scope:"files",icon:L.default.createElement(ne.IconDeliverDocRegular,{width:14,height:14}),value:`${a.files}${N}`,title:n.statsTooltip(a.files,a.directories,Ve(a.bytes))+T})),g.push(L.default.createElement(Rt,{key:"bytes",scope:"bytes",icon:L.default.createElement(ne.IconGaugeOutlineRegular,{width:14,height:14}),value:Ve(a.bytes),title:n.statsSizeTooltip(Ve(a.bytes))+T}))}}return g.push(L.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},L.default.createElement(ne.IconSettingsOutlineRegular,{width:14,height:14}))),L.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true","data-crowded":String(p),ref:w},L.default.createElement("div",{className:"nxe-status-left"},m),L.default.createElement("div",{className:"nxe-status-right"},g))}var Pn=oe(J("react"),1);function An({menu:e,actions:n,onClose:t}){return Pn.default.createElement(xt,{menu:e,actions:n,onClose:t})}var W=oe(J("@deepseek-ai/dsh-client-ui-primitives"),1);function be(e,n){let t=ke(e),a=String(n??"").replace(/\\/gu,"/");return a===""?t:a.startsWith("/")||/^[A-Za-z]:\//u.test(a)?ke(a):`${t==="/"?"":t}/${a}`.replace(/\/{2,}/gu,"/")}function de(e,n){return ke(be(e,n))}function Ga(e,n){let t=ke(e),a=ke(n);return t===a?!0:a.startsWith(t==="/"?"/":`${t}/`)}function ue(e,n){let t=ke(e),a=ke(n);return a===t?"":Ga(t,a)?a.slice(t==="/"?1:t.length+1):a}function Ue(e){let n=ke(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Ke(e){let n=ke(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function ke(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var Wa=5*60*1e3,Va=20*1e3,Ka=2e3,$t=new Map;async function qe(e,n){try{let t=await fetch(`/nano-explorer-extra${e}`,{method:n===void 0?"GET":"POST",headers:n===void 0?void 0:{"content-type":"application/json"},body:n===void 0?void 0:JSON.stringify(n),credentials:"same-origin",cache:"no-store"}),a=await t.json().catch(()=>({error:`HTTP ${t.status}`}));return t.ok?{ok:!0,...a}:{ok:!1,message:a?.error??`HTTP ${t.status}`}}catch(t){return{ok:!1,message:t instanceof Error?t.message:String(t)}}}function qa(e){let n=new Set,t=new Set,a=new Map,i={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},o=0,u=0,x=0,w=0,p=()=>!0,c=d=>te.span("apply-status",()=>{i={...i,...d};for(let S of n)S()}),l=(d,S)=>{let $=a.get(d);if($!==void 0)return $;let F=S().finally(()=>{a.get(d)===F&&a.delete(d)});return a.set(d,F),F},m=(d,S,$=!1)=>l(`level:${S}`,()=>te.span("list-level",async()=>{let F=de(e,S);if(!$){let b=new Map(i.levels);b.get(F)===void 0&&b.set(F,{loading:!0,entries:[]}),b!==i.levels&&c({levels:b})}let I=await qe("/list",{sessionId:d,path:S});w=Date.now();let V=new Map(i.levels),G=V.get(F);return I.ok?V.set(F,{entries:I.entries,truncated:I.truncated===!0,outside:I.outside===!0,failed:G?.failed===!0&&G.entries?.length>0?G.failed:!1}):V.set(F,{entries:G?.entries??[],failed:!0,message:I.message,code:I.code}),c({levels:V}),I.ok&&I.entries.length>0&&g(d,S,I.entries.map(b=>b.name)),I})),g=(d,S,$)=>!p()||!Array.isArray($)||$.length===0?Promise.resolve():l(`ignored:${S}:${$.join(",")}`,async()=>{let F=await qe("/ignored",{sessionId:d,paths:$});if(!F.ok||!Array.isArray(F.ignored)||F.ignored.length===0)return;let I=new Set(i.ignoredSet),V=ue(e,S);for(let G of F.ignored)I.add(V===""?G:`${V}/${G}`);c({ignoredSet:I})}),N=(d,S)=>p()?l(`dirstatus:${S}:${o}`,()=>te.span("dir-status",async()=>{let $=o,F=await qe(`/status?sessionId=${encodeURIComponent(d)}&path=${encodeURIComponent(S)}`);if($!==o||!F.ok||F.git===null||F.git===void 0)return;let I=F.git.root,V=I??e,G=ue(V,S);if(G===S&&G!=="")return;let b=[];for(let E of F.git.files??[]){let y=I===void 0?E.path:`${I.replace(/\/+$/u,"")}/${E.path}`,v=ue(V,y);v!==y&&b.push({...E,path:v})}c({directoryStatus:bn(i.directoryStatus,G,b)})})):Promise.resolve(),T=d=>p()?l("git",()=>te.span("git-refresh",async()=>{let S=o+1;o=S;let $=await qe(`/status?sessionId=${encodeURIComponent(d)}`);if(S===o){if(!$.ok){c({gitError:$.message});return}c({git:$.git??null,gitError:$.gitError,directoryStatus:new Map});for(let F of i.expanded)N(d,F)}})):((i.git!==null||i.gitError!==void 0||i.directoryStatus.size!==0)&&c({git:null,gitError:void 0,directoryStatus:new Map}),Promise.resolve()),D=d=>l("stats",()=>te.span("stats-count",async()=>{c({statsState:"loading"});let S=await qe(`/status?sessionId=${encodeURIComponent(d)}&only=stats`);if(!S.ok){c({statsState:"failed"});return}c({stats:S.stats??null,statsState:"ok"})})),B=d=>{clearTimeout(u),u=setTimeout(()=>{D(d)},Ka)},z=(d,S,$)=>{let F=de(e,S),I=i.expanded.has(F),V=new Set(i.expanded);$?V.add(F):V.delete(F),(V.size!==i.expanded.size||![...V].every(G=>i.expanded.has(G)))&&c({expanded:V}),$&&!I&&te.count("files-expand"),$&&i.levels.get(F)===void 0&&m(d,S)},M=d=>{let S=[...i.expanded];m(d,e,!0);for(let $ of S)m(d,$,!0);w=Date.now()};return{root:e,get state(){return i},subscribe:d=>(n.add(d),()=>n.delete(d)),mountCount:()=>t.size,mount:d=>{clearTimeout(x),typeof d?.showGitStatus=="function"&&(p=d.showGitStatus);let S={};return t.add(S),i.levels.size===0?m(d.sessionId,e):Date.now()-w>Va&&M(d.sessionId),S},unmount:d=>{t.delete(d),t.size===0&&(x=setTimeout(()=>$t.delete(e),Wa))},loadLevel:m,markIgnored:g,loadDirectoryStatus:N,refreshGit:T,refreshStats:D,queueStats:B,toggle:z,refresh:M,refreshLevel:(d,S)=>m(d,S,!0),knownEmpty:d=>{let S=de(e,d);if(i.levels.has(S))return;let $=new Map(i.levels);$.set(S,{entries:[]}),c({levels:$})},forget:d=>{let S=de(e,d);if(!i.levels.has(S))return;let $=new Map(i.levels);$.delete(S),c({levels:$})},collapseUnder:d=>{let S=de(e,d),$=new Set;for(let I of i.expanded)I!==S&&!I.startsWith(`${S}/`)&&$.add(I);let F=new Map;for(let[I,V]of i.levels)I!==S&&!I.startsWith(`${S}/`)&&F.set(I,V);c({expanded:$,levels:F})},dismissGitError:()=>{i.gitError!==void 0&&c({gitError:void 0})}}}function zn(e){let n=$t.get(e);if(n!==void 0)return n;let t=qa(e);return $t.set(e,t),t}var Ja=".md";function Ln(e,n){let t=e==="file"?"untitled":"new-folder",a=new Set((n??[]).map(o=>String(o.name??"").toLowerCase())),i=o=>e==="file"?`${t}${o===1?"":`-${o}`}${Ja}`:`${t}${o===1?"":`-${o}`}`;for(let o=1;o<1e4;o+=1){let u=i(o);if(!a.has(u.toLowerCase()))return u}throw new Error("cannot find an unused name")}function Fn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:U,useEffect:$e,useMemo:me,useRef:Ie,useState:ae,useSyncExternalStore:_n}=R.default,Ya=400,Xa=15e3,Un={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},Qa={levels:new Map,entries:[],directories:{},expanded:[],selected:null,setSelected:()=>{},loadLevel:()=>Promise.resolve(),refreshLevel:()=>Promise.resolve(),toggle:()=>{},refresh:()=>Promise.resolve(),forget:()=>{},collapseUnder:()=>{},knownEmpty:()=>{},pending:null,setPending:()=>{}},Za=["U","D","M","A","R","?"],er=new Set([".git",".DS_Store"]);function Hn(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function jn(e){let{useTabInfo:n,sessionId:t,useSessions:a,renderSlot:i,renderFactorySlot:o,useContextMenu:u,nxe:x}=e,{tab:w,panel:p}=n(),c=a(r=>r.byId[t]?.cwd),l=x.copy,m=_n(x.subscribePrefs,x.getPrefs,x.getPrefs),g=me(()=>c===void 0?null:zn(c),[c]),N=_n(U(r=>g?.subscribe(r)??(()=>{}),[g]),U(()=>g?.state??Un,[g]),()=>Un),{git:T,gitError:D,stats:B,statsState:z,ignoredSet:M,directoryStatus:C}=N,[j,H]=ae(null),[Z,d]=ae(null),[S,$]=ae(!1),[F,I]=ae(void 0),[V,G]=ae(void 0),[b,E]=ae(void 0),[y,v]=ae([]);$e(()=>{let r=!0;return(async()=>{try{let s=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!s.ok)return;let f=await s.json(),O=Array.isArray(f.apps)?f.apps:[];r&&v(O.filter(K=>typeof K=="string"))}catch{}})(),()=>{r=!1}},[]);let[_,A]=ae(null),[P,ge]=ae(null),[re,se]=ae(null),[ye,pe]=ae(null),[Kn,it]=ae(!1),[Dt,Pe]=ae(!1),[Bt,ve]=ae(void 0),[qn,st]=ae(!1),Oe=Ie(0);$e(()=>{pe(null),ve(void 0),st(!1),it(!1),d(null),I(void 0),A(null),se(null),ge(null)},[t,c,w.visible]);let It=Ie({path:"",at:0}),Je=Ie(m);Je.current=m;let X=U(async(r,s)=>{try{let f=await fetch(`/nano-explorer-extra${r}`,{method:s===void 0?"GET":"POST",headers:s===void 0?void 0:{"content-type":"application/json"},body:s===void 0?void 0:JSON.stringify(s),credentials:"same-origin",cache:"no-store"}),O=await f.json().catch(()=>({error:`HTTP ${f.status}`}));return f.ok?{ok:!0,...O}:{ok:!1,message:O?.error??`HTTP ${f.status}`}}catch(f){return{ok:!1,message:f instanceof Error?f.message:String(f)}}},[]);$e(()=>{if(g===null)return;let r=g.mount({sessionId:t,showGitStatus:()=>Je.current.showGitStatus});return()=>g.unmount(r)},[g,t]);let Pt=me(()=>{let r=[];for(let[s,f]of N.levels)for(let O of f.entries??[]){let K=s===""?O.name:`${s}/${O.name}`;r.push({...O,path:K})}return r},[N.levels]),At=me(()=>{let r={};for(let[s,f]of N.levels)f.loading===!0&&(f.entries?.length??0)===0?r[s]={loading:!0}:f.failed===!0?r[s]={failure:f.message}:f.truncated===!0&&(r[s]={truncated:!0});return r},[N.levels]),k=me(()=>g===null?Qa:{levels:N.levels,entries:Pt,directories:At,expanded:[...N.expanded],selected:j,setSelected:H,loadLevel:(r,s)=>g.loadLevel(t,r,s),refreshLevel:r=>g.refreshLevel(t,r),toggle:(r,s)=>g.toggle(t,r,s),refresh:()=>Promise.resolve(g.refresh(t)),forget:r=>g.forget(r),collapseUnder:r=>g.collapseUnder(r),knownEmpty:r=>g.knownEmpty(r),pending:null,setPending:()=>{}},[g,N.levels,N.expanded,Pt,At,j,t]),ee=U(()=>g?.refreshGit(t)??Promise.resolve(),[g,t]),xe=U(()=>g?.refreshStats(t)??Promise.resolve(),[g,t]),zt=U(r=>{g?.loadDirectoryStatus(t,r)},[g,t]),Lt=U(r=>{pe(r),ve(void 0),st(!0),ee().finally(()=>st(!1))},[ee]);$e(()=>{ee()},[ee]),$e(()=>{xe()},[xe]);let Ft=Ie(null);$e(()=>{if(g===null)return;let r=te.track("interval","git-poll"),s=window.setInterval(r.wrap(()=>{let f=Ft.current;f===null||f.closest('[hidden], [aria-hidden="true"]')!==null||g.refreshGit(t)}),Xa);return r.attach(),()=>{window.clearInterval(s),r.detach()}},[g,t]);let Ee=U(()=>{g?.queueStats(t)},[g,t]);$e(()=>()=>{window.clearTimeout(Oe.current)},[]);let Jn=me(()=>{let r=new Map;for(let s of k.entries)s.symlink===!0&&r.set(s.path,{outside:s.outside===!0});return r},[k.entries]),lt=me(()=>Array.isArray(T?.files)?T.files:[],[T]),ct=me(()=>{let r=new Map;for(let s of lt)r.set(s.path,s);return r},[lt]),Ye=T?.root,Se=me(()=>{if(C.size===0)return ct;let r=new Map(ct);for(let[s,f]of C)r.set(s,f);return r},[ct,C]),fe=U(r=>{if(Ye==null)return;let s=be(c??"",r);return ue(Ye,s)},[Ye,c]),dt=U(r=>{let s=fe(r);if(s===void 0)return!1;if(M.has(s))return!0;let f=s.split("/");for(let O=f.length-1;O>0;O-=1)if(M.has(f.slice(0,O).join("/")))return!0;return!1},[M,fe]),_t=U(r=>{let s=fe(r);if(s!==void 0)return Se.get(s)?.status},[Se,fe]),Yn=U(r=>{let s=fe(r);if(s!==void 0)return Se.get(s)?.staged},[Se,fe]),Xn=U(r=>{let s=fe(r);if(s!==void 0)return Se.get(s)?.unstaged},[Se,fe]),Ut=me(()=>{let r=new Map;for(let s of T?.remote?.pushed??[])r.set(s.path,{status:s.status,direction:"pushed"});for(let s of T?.remote?.pulled??[])r.set(s.path,{status:s.status,direction:"pulled"});return r},[T]),Qn=U(r=>{let s=fe(r);if(s!==void 0)return Ut.get(s)},[Ut,fe]),Me=U(r=>{let s=be(c??"",r.path),f=c??"",O=ue(f,s),le=f!==""&&O!==s?`dsh-resource://file/session/${encodeURIComponent(t)}/${Hn(O)}`:`dsh-resource://file/absolute/${Hn(s.replace(/^\/+/,""))}`;p.isFloating?w.actions.openResource(le):w.actions.openResource(le,{paneId:p.id})},[c,t,w.actions,p.id,p.isFloating]),ut=U(async r=>{let s=await k.loadLevel(r.path);k.toggle(r.path,!0),s?.ok&&zt(r.path)},[k,zt]),Zn=U(async r=>{$(!0);let s=await X("/delete",{sessionId:t,path:r.path,kind:r.kind==="directory"?"directory":"file"});if($(!1),!s.ok){G(s.message);return}se(null),G(void 0),k.forget(r.path),k.collapseUnder(r.path);let f=Ue(r.path);f!==r.path&&await k.refreshLevel(f),k.selected===r.path&&k.setSelected(null),Ee()},[t,X,k,Ee]),Ht=U(r=>{if(c===void 0)return;let s=tr(k,c),f=nr(k,c,s);G(void 0),A({kind:r,directory:s,proposed:Ln(r,f)})},[c,k]),ea=U(async r=>{if(_===null)return;let{kind:s,directory:f}=_,O=Fn(r,l);if(!O.ok){G(O.message);return}$(!0);let K=await X(s==="file"?"/create-file":"/create-folder",{sessionId:t,directory:f,name:O.name});if($(!1),!K.ok){G(K.message);return}A(null),G(void 0),await k.refreshLevel(f);let le=ue(c??"",f),Ae=be(c??"",`${le===""?"":`${le}/`}${O.name}`);k.setSelected(Ae),s==="folder"&&(k.knownEmpty(Ae),k.toggle(Ae,!0)),Ee()},[_,l,c,t,X,k,Ee]),ta=U(async(r,s)=>{if(c===void 0)return;let f=be(c,r.path),O=r.meta?.kind==="directory"?"directory":"file";$(!0),I(void 0);let K=await X("/rename",{sessionId:t,path:f,name:s,kind:O});if($(!1),!K.ok){I(K.message);return}d(null);let le=Ue(f);await k.refreshLevel(le),O==="directory"&&k.collapseUnder(f),k.setSelected(be(c,`${ue(c,le)===""?"":`${ue(c,le)}/`}${s.trim()}`)),Ee()},[c,t,X,k,Ee]),pt=U(async(r,s)=>{if(c===void 0)return;let f=be(c,r.path),O=await X("/move",{sessionId:t,path:f,directory:s});if(!O.ok){E(O.message),window.clearTimeout(Oe.current),Oe.current=window.setTimeout(()=>E(void 0),4e3);return}let K=Ue(f);await k.refreshLevel(K),await k.refreshLevel(s),r.meta?.kind==="directory"&&k.collapseUnder(f),k.selected===f&&k.setSelected(O.path),Ee(),ee()},[c,t,X,k,Ee,ee]),na=U(async r=>{$(!0),I(void 0);let s=await X("/commit",{sessionId:t,message:r});if($(!1),!s.ok){I(s.message);return}d(null),await k.refresh(),await ee(),await xe()},[t,X,k,ee,xe]),jt=U(async()=>{Pe(!0),ve(void 0);let r=await X("/pull",{sessionId:t});if(Pe(!1),!r.ok){ve(r.message);return}await k.refresh(),await ee(),await xe()},[t,X,k,ee,xe]),aa=U(async r=>{Pe(!0),ve(void 0);let s=await X("/checkout",{sessionId:t,branch:r});if(Pe(!1),!s.ok){ve(s.message);return}E(l.branchSwitched(r)),window.clearTimeout(Oe.current),Oe.current=window.setTimeout(()=>E(void 0),2e3),await k.refresh(),await ee(),await xe()},[t,X,k,ee,xe,l]),ra=U(async r=>{Pe(!0),ve(void 0);let s=await X("/commit",{sessionId:t,message:r});return Pe(!1),s.ok?(await k.refresh(),await ee(),await xe(),!0):(ve(s.message),!1)},[t,X,k,ee,xe]),ft=U(async(r,s)=>{try{await navigator.clipboard.writeText(s||r),E(l.copied),window.clearTimeout(Oe.current),Oe.current=window.setTimeout(()=>E(void 0),1600)}catch(f){G(f instanceof Error?f.message:String(f))}},[l.copied]),ht=Ie(0),Ne=Ie(null),mt=Ie("file"),Te=U(()=>{window.clearTimeout(ht.current),ht.current=0,Ne.current!==null&&Ne.current.removeAttribute("data-nxe-drop"),Ne.current=null},[]),Xe=U((r,s)=>{Te(),Ne.current=s,s.setAttribute("data-nxe-drop","true"),r!==null&&!k.expanded.includes(r.path)&&(ht.current=window.setTimeout(()=>{ut(r)},650))},[Te,ut,k.expanded]),gt=U(r=>(r.preventDefault(),r.stopPropagation(),Te(),r.dataTransfer?.getData("application/x-nxe-move")??""),[Te]),oa=U((r,s)=>({draggable:!0,onDragStart:f=>{mt.current=s,f.dataTransfer?.setData("application/x-nxe-move",r.path),f.dataTransfer&&(f.dataTransfer.effectAllowed="move")},onDragEnd:Te,onContextMenu:f=>{f.preventDefault(),f.stopPropagation(),k.setSelected(r.path),te.count("menu-open"),ge({x:f.clientX,y:f.clientY,path:r.path,name:r.name,kind:s,openedAt:Date.now()})},onDragOver:s==="directory"?f=>{f.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(f.preventDefault(),f.stopPropagation(),f.dataTransfer.dropEffect="move",Ne.current!==f.currentTarget&&Xe(r,f.currentTarget))}:void 0,onDragEnter:s==="directory"?f=>{f.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(f.currentTarget.contains(f.relatedTarget)||Xe(r,f.currentTarget))}:void 0,onDragLeave:s==="directory"?f=>{f.relatedTarget instanceof Node&&f.currentTarget.contains(f.relatedTarget)||Ne.current===f.currentTarget&&Te()}:void 0,onDrop:s==="directory"?f=>{let O=gt(f);O!==""&&pt({path:O,meta:{kind:mt.current}},r.path)}:void 0}),[k,Te,Xe,gt,pt]),ia=U(r=>{let s=fe(r);if(s===void 0)return;let f=s===""?"":`${s}/`,O,K=-1;for(let[le,Ae]of Se){if(f!==""&&!le.startsWith(f))continue;let Wt=Za.indexOf(Ae.status);Wt>K&&(K=Wt,O=Ae.status)}return O},[Se,fe]),Gt=me(()=>Bn({copy:()=>l,statusOf:_t,stagedOf:Yn,unstagedOf:Xn,remoteOf:Qn,ignoredOf:dt,folderStatusOf:ia,linkBrokenOf:r=>k.levels.get(de(c??"",r))?.code==="broken-link",linkOf:r=>{let s=Jn.get(r);if(s!==void 0)return s.outside===!0},showGit:()=>m.showGitStatus,showIgnoredBadge:()=>m.showIgnoredBadge,showOpenButton:()=>m.showOpenButton,statusLabel:r=>x.statusLabel(l,r),open:r=>Me(r)}),[l,_t,dt,k.levels,c,m.showGitStatus,m.showIgnoredBadge,m.showOpenButton,x,Me]),sa=me(()=>({slots:{accessory:Gt},fallback:null}),[Gt]);if(c===void 0)return R.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},l.noWorkspace);let la=k.entries.filter(r=>m.showSystemFiles||!er.has(r.name)).map(r=>({path:r.path,name:r.name,meta:{kind:r.type==="directory"?"directory":r.type==="file"?"file":"other",...r.symlink===!0?{link:!0}:{},...r.outside===!0?{outside:!0}:{},...dt(r.path)?{hidden:!0}:{}}})),ca=o("sidebar.files.tree",{root:de(c,c),entries:la,expanded:k.expanded,directories:k.directories,current:k.selected===null?void 0:de(c,k.selected),onToggle:r=>{if(k.expanded.includes(r.path)){k.toggle(r.path,!1);return}ut(r)},onOpen:r=>{k.setSelected(r.path);let s=Date.now(),f=It.current,O=f.path===r.path&&s-f.at<=Ya;It.current={path:r.path,at:s},(O?Je.current.openPreviewOnDoubleClick:Je.current.openPreviewOnClick)&&Me(r)},rowTriggerProps:oa,canOpen:()=>!0},sa);$e(()=>{let r=s=>{I(void 0),d({kind:"rename",entry:{path:s.path,name:Ke(s.path),meta:{kind:s.kind}}})};return x.setRenameHandler(r),()=>x.setRenameHandler(void 0)},[x]);let da=U(r=>{if(k.pending!==null)return;if(r.key==="F2"&&k.selected!==null){r.preventDefault(),I(void 0),d({kind:"rename",entry:{path:k.selected,name:Ke(k.selected),meta:{kind:k.levels.has(k.selected)?"directory":"file"}}});return}let s=k.selected;if(s===null)return;let f=de(c??"",s),O=k.levels.has(f)||k.expanded.includes(f);if(r.key===" "){if(!O)return;r.preventDefault(),k.toggle(s,!k.expanded.includes(f));return}if(r.key==="Enter"){if(r.preventDefault(),O){k.toggle(s,!k.expanded.includes(f));return}Me({path:f,name:Ke(s),meta:{kind:"file"}})}},[k,c,Me]),ua=Z===null?null:Z.kind==="commit"?R.default.createElement(mn,{copy:l,files:lt,busy:S,error:F,onConfirm:na,onCancel:()=>{d(null),I(void 0)}}):R.default.createElement(Nt,{copy:l,currentName:Z.entry.name,busy:S,error:F,onConfirm:r=>ta(Z.entry,r),onCancel:()=>{d(null),I(void 0)}}),pa=me(()=>{if(P===null)return[];let r={path:P.path,name:P.name,kind:P.kind},s=y[0],f=O=>{let K=be(c??"",P.path),le=P.kind==="directory"?K:Ue(K);fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:O,path:le}),credentials:"same-origin"})};return[s===void 0?null:{id:"reveal",label:l.revealIn(rt[s]??s),icon:R.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(s)}`,alt:"",width:14,height:14}),run:()=>{f(s)}},{id:"copy-path",label:l.copyAbsolute,icon:R.default.createElement(W.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{ft(P.path,P.path)}},{id:"copy-relative",label:l.copyRelative,icon:R.default.createElement(W.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{ft(P.path,ue(c??"",P.path))}},P.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:l.openInNotepad,icon:R.default.createElement(W.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let O=await X("/read",{sessionId:t,path:P.path});if(!O.ok){G(O.message??l.openInNotepadFail);return}G(void 0);let K=P.path.startsWith("/")?P.path:`${c??""}/${P.path}`;await window.__nanoNotepad.import(P.name,O.content,{sourcePath:K})}},{id:"rename",label:l.rename,icon:R.default.createElement(W.IconEditOutlineRegular,{width:14,height:14}),run:()=>{I(void 0),d({kind:"rename",entry:{...r,meta:{kind:P.kind}}})}},{id:"delete",label:l.delete,tone:"danger",icon:R.default.createElement(W.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{G(void 0),se(r)}}].filter(Boolean)},[P,l,y,c,ft]);return R.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":x.scheme(),ref:Ft},R.default.createElement("div",{className:"nxe-header"},R.default.createElement("span",{className:"nxe-path",title:c,"data-nxe-path":"true"},c),R.default.createElement(at,{label:l.newFile,onClick:()=>{Ht("file")}},sr()),R.default.createElement(at,{label:l.newFolder,onClick:()=>{Ht("folder")}},lr()),R.default.createElement(at,{label:l.rename,disabled:k.selected===null,onClick:()=>{let r=k.selected;r!==null&&(I(void 0),d({kind:"rename",entry:{path:r,name:Ke(r),meta:{kind:k.levels.has(r)?"directory":"file"}}}))}},dr()),R.default.createElement(ur,{copy:l,cwd:c??"",apps:y}),R.default.createElement(at,{label:l.reload,onClick:()=>{k.refresh(),ee()}},cr())),V===void 0?null:R.default.createElement("p",{className:"nxe-row-note",role:"status"},V),re===null?null:R.default.createElement(Le,{copy:l,title:l.deleteTitle,busy:S,confirmLabel:l.delete,onConfirm:()=>{Zn(re)},onCancel:()=>{se(null),G(void 0)},description:R.default.createElement(R.default.Fragment,null,l.deleteBody(re.name),re.kind==="directory"?R.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${l.deleteFolderNote}`):null)}),_===null?null:R.default.createElement(Nt,{copy:l,mode:"create",busy:S,currentName:_.proposed,onConfirm:r=>{ea(r)},onCancel:()=>{A(null),G(void 0)}}),R.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:da,onDragOver:r=>{r.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(r.preventDefault(),r.dataTransfer.dropEffect="move",Ne.current!==r.currentTarget&&Xe(null,r.currentTarget))},onDragLeave:r=>{r.relatedTarget instanceof Node&&r.currentTarget.contains(r.relatedTarget)||Ne.current===r.currentTarget&&Te()},onDrop:r=>{let s=gt(r);s!==""&&pt({path:s,meta:{kind:mt.current}},c)}},ca),R.default.createElement(wt,{text:b}),D===void 0?null:R.default.createElement("div",{className:"nano-toast nxe-git-alert",role:"alert","data-nxe-git-alert":"true"},R.default.createElement(W.IconWarningOutlineRegular,{width:14,height:14,className:"nxe-git-alert-icon","aria-hidden":"true"}),R.default.createElement("span",{className:"nxe-git-alert-text"},D),R.default.createElement("button",{type:"button",className:"nxe-git-alert-x",title:l.dismiss,"aria-label":l.dismiss,onClick:()=>g?.dismissGitError()},R.default.createElement(W.IconCloseOutlineRegular,{width:12,height:12,"aria-hidden":"true"}))),R.default.createElement(In,{copy:l,git:T,stats:B,statsState:z,prefs:m,onOpenBranch:()=>Lt("branch"),onOpenCommit:()=>Lt("commit"),onRetryStats:()=>{xe()},onOpenSettings:()=>it(!0)}),ua,R.default.createElement(Dn,{copy:l,open:Kn,prefs:m,onClose:()=>it(!1),setPref:(r,s)=>x.setPref(r,s)}),R.default.createElement(Sn,{copy:l,open:ye==="branch",git:T,busy:Dt,error:Bt,onClose:()=>{pe(null),ve(void 0)},onPull:jt,onCheckout:aa,onRefresh:async()=>{await ee()},onOpenConflict:r=>{Me({path:be(c??"",r)}),pe(null)}}),R.default.createElement(Nn,{copy:l,open:ye==="commit",git:T,busy:Dt,error:Bt,refreshing:qn,onClose:()=>{pe(null),ve(void 0)},onCommit:ra,onPull:jt,onOpenConflict:r=>{Me({path:be(c??"",r)}),pe(null)}}),R.default.createElement(An,{menu:P,copy:l,actions:pa,onClose:()=>ge(null)}))}function at({label:e,onClick:n,children:t,disabled:a}){return R.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:a===!0},t)}function tr(e,n){let t=e.selected;if(t===null)return n;let a=de(n,t);return e.levels.has(a)?a:Ue(a)}function nr(e,n,t){return e.levels.get(de(n,t))?.entries??[]}var ar=W.IconPlusOutlineRegular,rr=W.IconFolderCloseRegular,or=W.IconEditOutlineRegular,ir=W.IconRefreshOutlineRegular;function sr(){return R.default.createElement(ar,{width:16,height:16})}function lr(){return R.default.createElement(rr,{width:16,height:16})}function cr(){return R.default.createElement(ir,{width:16,height:16})}function dr(){return R.default.createElement(or,{width:16,height:16})}function ur({copy:e,cwd:n,apps:t}){let a=Array.isArray(t)?t:[];if(n===""||a.length===0)return null;let[i,o]=R.default.useState(a[0]),[u,x]=R.default.useState(!1),w=R.default.useRef(null),p=a.includes(i)?i:a[0];R.default.useEffect(()=>{if(!u)return;let l=g=>{w.current!==null&&!w.current.contains(g.target)&&x(!1)},m=g=>{g.key==="Escape"&&x(!1)};return document.addEventListener("pointerdown",l,!0),document.addEventListener("keydown",m,!0),()=>{document.removeEventListener("pointerdown",l,!0),document.removeEventListener("keydown",m,!0)}},[u]);let c=l=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:l,path:n}),credentials:"same-origin"})};return R.default.createElement("span",{className:"nxe-reveal",ref:w,"data-nxe-reveal":p},R.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(rt[p]??p),"aria-label":e.revealIn(rt[p]??p),onClick:()=>{c(p)}},R.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(p)}`,alt:"",width:14,height:14})),R.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),R.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(u),onClick:()=>x(l=>!l)},R.default.createElement(W.IconChevronDownOutlineRegular,{width:10,height:10,"aria-hidden":"true"})),u?R.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},a.map(l=>R.default.createElement("button",{key:l,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{o(l),x(!1),c(l)}},R.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},R.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(l)}`,alt:"",width:14,height:14})),R.default.createElement("span",{className:"nano-menu-label"},rt[l]??l)))):null)}var rt={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var pr={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0 Git \u72B6\u6001",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",dismiss:"\u5173\u95ED",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`\u4ED3\u5E93 \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitRefreshing:"\u6B63\u5728\u8BFB\u53D6\u6700\u65B0\u72B6\u6001",commitDrawerBody:(e,n)=>n?`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${n} \xB7 ${e} \u5904\u6539\u52A8`:`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${e} \u5904\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchConflictBlocks:"\u8FD9\u4E9B\u6587\u4EF6\u8FD8\u5728\u51B2\u7A81\u4E2D\u3002\u89E3\u51B3\u4E4B\u524D\uFF0C\u8FD9\u5F20\u5361\u7247\u91CC\u7684\u5207\u6362\u5206\u652F\u4E0D\u4F1A\u6267\u884C\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,checkoutTitle:e=>`\u5207\u6362\u5230 ${e}\uFF1F`,checkoutBody:e=>`\u5F53\u524D\u5DE5\u4F5C\u6811\u4F1A\u6539\u5230\u5206\u652F ${e}\u3002\u672A\u63D0\u4EA4\u7684\u66F4\u6539\u5982\u679C\u4F1A\u88AB\u8986\u76D6\uFF0C\u5207\u6362\u4F1A\u88AB\u62D2\u7EDD\u3002`,checkoutConfirm:"\u5207\u6362",worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u63D0\u4EA4\u56FE",localStaged:"\u5DF2\u6682\u5B58",localUnstaged:"\u672A\u6682\u5B58",localUntracked:"\u672A\u8DDF\u8E2A",localConflicts:"\u51B2\u7A81",filterChanges:"\u6309\u66F4\u6539\u7C7B\u578B\u7B5B\u9009",filterAll:"\u5168\u90E8",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Refresh Git status",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",dismiss:"Dismiss",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`Repository \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitRefreshing:"Reading latest status",commitDrawerBody:(e,n)=>n?`Working tree \xB7 ${n} \xB7 ${e} changes`:`Working tree \xB7 ${e} changes`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchConflictBlocks:"These files are still in conflict. Branch switches in this card do nothing until they are resolved.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,checkoutTitle:e=>`Switch to ${e}?`,checkoutBody:e=>`This worktree will move to ${e}. If local changes would be overwritten, the switch is refused.`,checkoutConfirm:"Switch",worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"History",localStaged:"Staged",localUnstaged:"Unstaged",localUntracked:"Untracked",localConflicts:"Conflicts",filterChanges:"Filter by change type",filterAll:"All",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function fr(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function He(e){return pr[fr(e)]}function Gn(e,n,t,a){let i={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&a!==void 0?e.statusBoth(i):t!==void 0?e.statusStaged(i):a!==void 0?e.statusUnstaged(i):i}var Wn=`${bt}

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
  /* Every mark sits in the same 14px cell. The gap is what keeps a link glyph off the status dot. */
  display: inline-flex; align-items: center; justify-content: flex-end;
  flex: 0 0 auto; gap: 4px;
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
   The shared tree does not expose the row name element to its accessory, so the tint is selected
   from the sibling accessory that carries the status letter: the :has() selector keeps the row itself untouched. */
/* A row is tinted by the status it reports, whether that is a file's letter or a folder's summary dot.
   Both mark kinds are matched here, so a folder that contains changes colours like the files inside it. */
[data-nxe] .nxe-tree li[data-files-entry]:has([data-status="M"]) > div > button > span { color: var(--nxe-git-modified); }
[data-nxe] .nxe-tree li[data-files-entry]:has([data-status="A"]) > div > button > span { color: var(--nxe-git-added); }
[data-nxe] .nxe-tree li[data-files-entry]:has([data-status="?"]) > div > button > span { color: var(--nxe-git-untracked); }
[data-nxe] .nxe-tree li[data-files-entry]:has([data-status="D"]) > div > button > span { color: var(--nxe-git-deleted); }
[data-nxe] .nxe-tree li[data-files-entry]:has([data-status="R"]) > div > button > span { color: var(--nxe-git-renamed); }
[data-nxe] .nxe-tree li[data-files-entry]:has([data-status="U"]) > div > button > span { color: var(--nxe-git-conflicted); }

/* The folder's glyph takes the same tint so the row reads as one unit. */
[data-nxe] .nxe-tree li[data-files-entry="directory"]:has([data-status]) > div > button > svg { color: inherit; opacity: .85; }


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
[data-nxe] .nxe-tree li[data-files-entry]:has([data-nxe-ignored]) > div > button > span:last-child,
[data-nxe] .nxe-tree li[data-files-entry]:has([data-nxe-ignored]) > div > button > svg { color: var(--nxe-ignored-ink); }

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
`;var je=oe(J("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:ot,useCallback:Bo,useEffect:Io,useState:Po}=Mt.default,hr=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var mr="files",Ot="nano-explorer-extra",Vn={handler:void 0};function gr(){let e=$n(),n=new Set;return{get:()=>e,set:t=>{e=t,On(e);for(let a of n)a()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function xr(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=Wn,document.head.append(n),e.effect(()=>()=>n.remove());let t=gr(),a=p=>e.sessions.list.getSnapshot().byId[p]?.cwd,i=p=>{Vn.handler?.(p)},o=()=>e.locale.getSnapshot().active,u=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",x=()=>({copy:He(o()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:p=>t.subscribe(p),scheme:u,statusLabel:Gn,onListed:()=>{},setRenameHandler:p=>{Vn.handler=p},setPref:(p,c)=>t.set({...t.get(),[p]:c})});e.effect(()=>e.sidebarRightTabs.register({id:Ot,kind:mr,priority:"extension",keepMounted:!0,title:()=>He(o()).typeLabel,guide:[{id:"explorer",order:10,title:()=>He(o()).typeLabel,description:()=>He(o()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:Ot,inject:()=>({nxe:x()})},jn)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:Ot},function({useTabInfo:c}){let{tab:l}=c();return ot(Mt.default.Fragment,null,ot(je.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),l.title)})),"nano-explorer-extra: files tab title");let w=e.get("contextMenus");if(w!=null)for(let p of["file","directory"])e.effect(()=>w.register({id:`nano-explorer-extra.${p}`,target:p,order:900,resolve:async c=>{let l=He(o()),m=c.sessionId===void 0?void 0:a(c.sessionId),g=m===void 0?c.path:ue(m,c.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:l.copyRelative,failureLabel:l.copyFailed,run:()=>wr(g)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:l.rename,failureLabel:l.renameFailed,run:()=>i?.({path:c.path,kind:p==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${p} menu`);e.slots.inject("contextMenu.icon",()=>{let p=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},br),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},vr)];return()=>{for(let c of p)c()}})}async function wr(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function br(){return ot(je.IconLinkOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}function vr(){return ot(je.IconEditOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}return ba(yr);})();
		return __nxeExport;
	}
});
