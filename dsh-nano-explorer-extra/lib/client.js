window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var ga=Object.create;var tt=Object.defineProperty;var xa=Object.getOwnPropertyDescriptor;var wa=Object.getOwnPropertyNames;var ba=Object.getPrototypeOf,va=Object.prototype.hasOwnProperty;var J=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var ya=(e,n)=>{for(var t in n)tt(e,t,{get:n[t],enumerable:!0})},Kt=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let i of wa(n))!va.call(e,i)&&i!==t&&tt(e,i,{get:()=>n[i],enumerable:!(a=xa(n,i))||a.enumerable});return e};var se=(e,n,t)=>(t=e!=null?ga(ba(e)):{},Kt(n||!e||!e.__esModule?tt(t,"default",{value:e,enumerable:!0}):t,e)),ka=e=>Kt(tt({},"__esModule",{value:!0}),e);var Nr={};ya(Nr,{DEFAULT_PREFS:()=>Ue,apply:()=>yr,inject:()=>wr});var It=se(J("react"),1);var C=se(J("react"),1);var le=se(J("react"),1),Tt=J("@deepseek-ai/dsh-client-ui-primitives");var Ie=se(J("react"),1),Ge=J("@deepseek-ai/dsh-client-ui-primitives");function ke({copy:e,title:n,description:t,confirmLabel:a,confirmDisabled:i,busy:o,error:d,danger:x,footer:w,maxHeight:u,width:c,region:l,onConfirm:m,onCancel:g,children:T}){return Ie.default.createElement(Ge.Modal,{open:!0,onClose:g,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",u===void 0?"":"nano-dialog-capped",c===void 0?"":"nano-dialog-sized",l===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:w??Ie.default.createElement(Ie.default.Fragment,null,Ie.default.createElement(Ge.Button,{variant:"outline",className:"nano-modal-action",onClick:g},e.cancel),Ie.default.createElement(Ge.Button,{variant:x?"outline":"primary",className:x?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:i===!0||o===!0,onClick:m},a??e.confirm))},T,d===void 0?null:Ie.default.createElement("p",{className:"nano-dialog-error",role:"alert"},d))}var Be=se(J("react"),1),{useCallback:Rr,useEffect:qt,useRef:Jt,useState:Ea}=Be.default;function bt({menu:e,actions:n,onClose:t,width:a=208,maxHeight:i}){let o=Jt(null),[d,x]=Ea(0),w=e===null?[]:n,u=w.length,c=Jt(w);c.current=w;let l=e===null?null:e.openedAt;if(qt(()=>{l!==null&&x(0)},[l]),qt(()=>{if(e===null)return;let R=A=>{o.current!==null&&!o.current.contains(A.target)&&t()},P=A=>{if(A.key==="Escape"){A.stopPropagation(),t();return}if(A.key==="ArrowDown"){A.preventDefault(),x(F=>(F+1)%u);return}if(A.key==="ArrowUp"){A.preventDefault(),x(F=>(F-1+u)%u);return}A.key==="Enter"&&(A.preventDefault(),t(),c.current[d]?.run())};return document.addEventListener("pointerdown",R,!0),document.addEventListener("keydown",P,!0),()=>{document.removeEventListener("pointerdown",R,!0),document.removeEventListener("keydown",P,!0)}},[e,d,u,t]),e===null||u===0)return null;let m=u*28+8,g=Math.min(e.x,(window.innerWidth||a)-a-8),T=Math.min(e.y,(window.innerHeight||m)-m-8);return Be.default.createElement("div",{className:"nano-menu",role:"menu",ref:o,style:{position:"fixed",left:`${Math.max(8,g)}px`,top:`${Math.max(8,T)}px`,minWidth:`${a}px`,...typeof i=="number"?{maxHeight:`${Math.round(i)}px`,overflowY:"auto",overscrollBehavior:"contain"}:{}},"data-nano-menu":"true"},w.map((R,P)=>Be.default.createElement(Yt,{key:R.id,item:R,index:P,active:P===d,onHover:x,onRun:t})))}function Yt({item:e,index:n,active:t,onHover:a,onRun:i}){return Be.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>a(n),onClick:()=>{i(),e.run()}},e.icon===void 0?null:Be.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),Be.default.createElement("span",{className:"nano-menu-label"},e.label))}var Xt=se(J("react"),1);function vt({text:e}){return e==null?null:Xt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var yt=`
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
`;var fn=se(J("react"),1);var Le="0.1.0";var Ve=/^[a-z0-9][a-z0-9-]{0,39}$/;function de(e,n){if(!Array.isArray(e)||e.length===0)return null;let t=[...e].sort((i,o)=>i-o),a=Math.min(t.length-1,Math.max(0,Math.ceil(n*t.length)-1));return t[a]}function Sa(){return{n:0,window:[],reservoir:[]}}function Qt(e,n,t=64){if(e.n+=1,e.window.push(n),e.reservoir.length<t)e.reservoir.push(n);else{let a=Math.floor(Math.random()*e.n);a<t&&(e.reservoir[a]=n)}}function kt(){return{startedAt:0,interactions:[],pendingInteractions:new Map,spanEvents:[],trackEvents:[],loafCount:0,blockingMs:0,forcedLayoutMs:0,nanoScriptMs:0,nanoLoafCount:0,nanoBlockingMs:0,pluginScriptMs:new Map,resources:{nanoClientJsBytes:0,comboResources:0,totalJsBytes:0},counts:new Map}}function Zt(){return{rootErrors:0,badNames:0,overflowSpans:0,overflowUsage:0,observerErrors:0,observersMissing:0,hostWriteErrors:0}}function Na(){return{meta:{version:null,implantedAt:null},own:{interactions:[]},native:{spanMs:[],trackMs:[]},samples:{spans:0,callbacks:0},spans:new Map,tracks:new Map,usage:new Map,profiler:{commits:0,durations:[]}}}function en(e,n){let t=e.get(n);return t===void 0&&(t=Na(),e.set(n,t)),t}function tn(e,n,t){if(!Ve.test(t))return n.badNames+=1,null;let a=e.spans.get(t);if(a===void 0){if(e.spans.size>=32)return n.overflowSpans+=1,null;a=Sa(),e.spans.set(t,a)}return a}function nn(e,n,t,a){return Ve.test(t)?!e.usage.has(t)&&e.usage.size>=32?(n.overflowUsage+=1,!1):(e.usage.set(t,(e.usage.get(t)??0)+a),!0):(n.badNames+=1,!1)}function an(e,n,t,a){if(!Ve.test(t))return n.badNames+=1,null;let i=e.tracks.get(t);if(i===void 0){if(e.tracks.size>=32)return n.overflowSpans+=1,null;i={kind:a,callbacks:0,live:0,callbackMs:0},e.tracks.set(t,i)}return i}function Et(e){if(typeof e!="string"||e.length===0)return[];let n=[],t=/dsh-nano-[a-z0-9-]+/g,a;for(;(a=t.exec(e))!==null;)n.includes(a[0])||n.push(a[0]);return n}function rn(e){if(typeof e!="string")return null;let n=/^dsh-nano-([a-z0-9-]+)$/.exec(e);return n===null?null:`nano-${n[1]}`}function nt(e){if(e==null||typeof e!="object")return"other";let n=e.attrs??{},t=a=>n[a]!==void 0&&n[a]!==null;return t("data-composer")||t("data-chat-input")?"composer-textarea":t("data-nano-notepad")?"notepad-panel":t("data-nano-model-selector")?"model-trigger":t("data-nxe")?"files-row":t("data-nano-shared-workspace")?"shared-row":t("data-row-key")||t("data-sidebar-row")?"sidebar-row":e.tag==="TEXTAREA"?"composer-textarea":"other"}function q(e){return e==null?null:Math.round(e*10)/10}function on(e,n){for(e.interactions.push(n);e.interactions.length>50;)e.interactions.shift()}function sn(e,n,t){let a=e.start-1,i=e.start+e.duration+8,o={},d=w=>{let u=o[w];return u===void 0&&(u={spans:0,callbacks:0,spanMs:0,trackMs:0,spanAfterWindow:!1},o[w]=u),u},x=new Map;for(let w of n)if(w.start<=i&&w.end>=a){let u=d(w.pluginId);u.spans+=1,w.end>i&&(u.spanAfterWindow=!0);let c=Math.max(w.start,a),l=Math.min(w.end,i);if(l>c){let m=x.get(w.pluginId);m===void 0&&(m=[],x.set(w.pluginId,m)),m.push([c,l])}}for(let[w,u]of x){u.sort((g,T)=>g[0]-T[0]);let c=0,[l,m]=u[0];for(let g=1;g<u.length;g+=1){let[T,R]=u[g];T>m?(c+=m-l,l=T,m=R):R>m&&(m=R)}c+=m-l,d(w).spanMs=c}for(let w of t)if(w.at>=a&&w.at<=i){let u=d(w.pluginId);u.callbacks+=1,u.trackMs+=w.ms}return o}var $a=e=>({n:e.n,windowN:e.window.length,p50:q(de(e.window,.5)),p95:q(de(e.window,.95)),maxMs:q(e.window.length===0?null:Math.max(...e.window))});function Oa(e,n){let t={},a=e?.plugins?.[n]?.spans;if(a==null)return t;for(let[i,o]of Object.entries(a)){let d=Array.isArray(o.samples)?o.samples:[];t[i]={n:o.n??d.length,p50:q(de(d,.5)),p95:q(de(d,.95))}}return t}function ln(e){let{collector:n,plugins:t,structure:a}=e,i=[],o=n.interactions.map(l=>l.duration),d=l=>q(de(n.interactions.map(m=>m[l]).filter(m=>typeof m=="number"),.95)),x={nativeInpP75:q(de(o,.75)),nativeInpCount:o.length,nativeInpDurationThreshold:16,inputDelayP95:d("inputDelay"),processingP95:d("processing"),presentationP95:d("presentation"),loafCount:n.loafCount,blockingMs:q(n.blockingMs),forcedLayoutMs:q(n.forcedLayoutMs),nanoCombined:{scriptMs:q(n.nanoScriptMs),loafCount:n.nanoLoafCount,blockingMs:q(n.nanoBlockingMs),clientJsBytes:n.resources.nanoClientJsBytes,comboResources:n.resources.comboResources},resources:{nanoClientJsBytes:n.resources.nanoClientJsBytes,totalJsBytes:n.resources.totalJsBytes}},w={};for(let[l,m]of t){let g=m.own.interactions,T={};for(let[A,F]of m.spans)T[A]=$a(F);let R={};for(let[A,F]of m.tracks)R[A]={kind:F.kind,callbacks:F.callbacks,live:F.live,callbackMs:q(F.callbackMs),totalCallbacks:F.totalCallbacks??F.callbacks,totalCallbackMs:q(F.totalCallbackMs??F.callbackMs)};let P={};for(let[A,F]of m.usage)P[A]=F;w[l]={meta:{version:m.meta.version??null,implantedAt:m.meta.implantedAt??null,implanted:!0},own:{inpP75:q(de(g,.75)),inpCount:g.length},native:{spanMsP95:q(de(m.native.spanMs,.95)),trackMsP95:q(de(m.native.trackMs,.95)),samples:{spans:m.samples.spans,callbacks:m.samples.callbacks}},spans:T,tracks:R,usage:P,hostSpan:Oa(e.hostSnapshot,l),profiler:{commits:m.profiler.commits,commitP95:q(de(m.profiler.durations,.95))},scriptMs:q(n.pluginScriptMs.get(l)??0)}}let u={};for(let[l,m]of n.counts)u[l]=m;return n.interactions.some(l=>Object.values(l.samples??{}).some(m=>m.spanAfterWindow))&&i.push("spanAfterWindow: \u6709\u5F02\u6B65 span \u5728\u4EA4\u4E92\u7A97\u53E3\u7ED3\u675F\u540E\u624D settle\uFF0C\u4ECD\u6309\u8D77\u70B9\u5212\u5165\u8BE5\u7A97\u53E3\u3002"),n.nanoBlockingMs>0&&i.push("nanoBlockingMs \u6309\u6574\u6761 LoAF \u6761\u76EE\u5F52\u5E76\uFF1B\u542B\u975E nano \u811A\u672C\u7684\u5E27\u4F1A\u628A\u90A3\u90E8\u5206\u65F6\u95F4\u4E00\u5E76\u8BA1\u5165\u3002"),o.length>0&&o.length<8&&i.push(`nativeInpCount=${o.length} < 8\uFF1Ap75 \u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u4F5C\u9884\u7B97\u5224\u65AD\uFF1B\u8FD9\u4E0D\u662F web-vitals INP\u3002`),i.push("Event Timing \u4E09\u6BB5\uFF1AinputDelay=\u4E3B\u7EBF\u7A0B\u5FD9/\u6392\u961F\uFF0Cprocessing=\u4E8B\u4EF6\u5904\u7406\u5668\uFF0Cpresentation=\u7B49\u4E0B\u4E00\u6B21\u7ED8\u5236\u3002\u9875\u7EA7 nativeInpP75 \u542B presentation\uFF0C\u5C5E\u73AF\u5883\u7EA7\u8BFB\u6570\uFF0C\u4E0D\u6284\u8FDB\u63D2\u4EF6\u884C\uFF08spec \xA75.1\uFF09\uFF1B\u63D2\u4EF6\u9884\u7B97\u4EE5 inputDelayP95/processingP95 \u4E0E native.spanMsP95/trackMsP95 \u4E3A\u51C6\u3002"),i.push("lab \u7684 composer-type \u7528 CDP \u5408\u6210\u6309\u952E\uFF08page.keyboard.type\uFF09\uFF0C\u62AC\u8D77\u7684\u662F presentation \u6BB5\uFF1B\u8BFB\u6570\u6807\u6CE8\u4E3A synthetic input\uFF0C\u4E0D\u7B49\u540C\u771F\u5B9E\u7528\u6237 INP\u3002"),i.push("nanoCombined.scriptMs \u53EA\u7EDF\u8BA1 >50ms \u957F\u5E27\u91CC >5ms \u7684\u811A\u672C\u6761\u76EE\uFF0C\u4E0D\u662F\u603B\u811A\u672C\u8017\u65F6\uFF1B\u5FEB\u800C\u9891\u7E41\u7684\u811A\u672C\u5DE5\u4F5C\u4E0D\u53EF\u89C1\u3002"),i.push("nanoCombined.blockingMs \u628A\u300C\u542B\u4EFB\u4E00 nano \u811A\u672C\u300D\u7684\u6574\u6761 LoAF blockingDuration \u8BA1\u5165\uFF0C\u542B\u975E nano \u90E8\u5206\uFF0C\u5C5E\u8FC7\u5EA6\u5F52\u56E0\u3002"),i.push("nanoCombined.clientJsBytes \u662F\u6240\u6709 dsh-nano-* \u5305 combo \u7684 encodedBodySize \u5408\u8BA1\uFF0C\u4E0D\u662F\u5355\u4E2A\u63D2\u4EF6\u7684\u4F53\u79EF\u3002"),n.pluginScriptMs.size===0&&i.push("\u9010\u5305 scriptMs \u5168\u4E3A 0\uFF1Acombo URL \u542B\u591A\u4E2A\u5305\u540D\uFF0C\u5355\u5305 URL \u6781\u5C11\u51FA\u73B0\uFF1B\u6309 \xA73.1 \u4E0D\u4E88\u62C6\u5206\u3002"),{version:1,meta:{generatedAt:e.meta?.generatedAt??null,scenario:e.meta?.scenario??null,arm:e.meta?.arm??"on",dshVersion:e.meta?.dshVersion??null,chromeMajor:e.meta?.chromeMajor??null,observerVersion:e.meta?.observerVersion??null,contributors:e.meta?.contributors??[],gitSha:e.meta?.gitSha??null,labels:e.meta?.labels??{}},enabled:e.enabled===!0,loafSupported:e.loafSupported!==!1,page:x,plugins:w,counts:u,structure:{...a},notes:i}}function cn(e,n){if(n==null||typeof n!="object")return e;for(let[t,a]of Object.entries(e.plugins??{})){let i=n.plugins?.[t]?.spans;if(i==null)continue;let o={...a.hostSpan??{}};for(let[d,x]of Object.entries(i)){let w=Array.isArray(x.samples)?x.samples:[];o[d]={n:x.n??w.length,p50:q(de(w,.5)),p95:q(de(w,.95))}}a.hostSpan=o}return e.structure={...e.structure??{},hostWriteErrors:(e.structure?.hostWriteErrors??0)+(n.structure?.hostWriteErrors??0)},e.meta={...e.meta??{},hostSinceStart:n.sinceStart??null,hostWrittenAt:n.writtenAt??null,hostEnabled:n.enabled??null,hostWindow:n.window===!0},e}var Da=4096,Ma=4096,Ia=128,he=e=>e.now(),Ba=e=>e!==null&&typeof e=="object"&&typeof e.then=="function";function Pa(e){if(e.forceEnabled!==void 0)return e.forceEnabled===!0;try{if(e.localStorage?.getItem?.("dsh-perf-review")==="1")return!0}catch{}try{let n=e.location?.search??"";if(/(?:^|[?&])perf-review=1(?:&|$)/.test(n))return!0}catch{}return!1}function Aa(e,n){let t=e,a=0;for(;t!=null&&typeof t=="object"&&a<12;){let i={tag:t.tagName,attrs:{}};for(let d of n)try{typeof t.hasAttribute=="function"&&t.hasAttribute(d)&&(i.attrs[d]=!0)}catch{}let o=nt(i);if(o!=="other")return o;t=t.parentElement??null,a+=1}return nt({tag:e?.tagName,attrs:{}})}var za=["data-composer","data-chat-input","data-nano-notepad","data-nano-model-selector","data-nxe","data-nano-shared-workspace","data-row-key","data-sidebar-row"],dn='[hidden],[aria-hidden="true"]';function Fa(e,n=null){if(e==null||typeof e!="object"||e.isConnected===!1||e.hidden===!0)return!1;try{if(typeof e.closest=="function"&&e.closest(dn)!==null)return!1}catch{}if(n!=null){if(n.hidden===!0)return!1;try{if(typeof n.closest=="function"&&n.closest(dn)!==null)return!1}catch{}}return!0}function pn(e,n=null){for(let t of e??[]){let a=n===null?null:n(t);if(Fa(t,a))return t}return null}var un=(e,n)=>e==null||n==null?!1:e===n?!0:typeof e.contains=="function"?e.contains(n):!1;function La(e,n,t){let a=null;for(let[i,o]of e){if(typeof o._root!="function")continue;let d;try{d=o._root()}catch{t.rootErrors+=1;continue}if(d==null)continue;let x=!1;try{x=un(d,n)}catch{t.rootErrors+=1;continue}if(x){if(a===null){a={pluginId:i,root:d};continue}try{un(a.root,d)&&d!==a.root&&(a={pluginId:i,root:d})}catch{t.rootErrors+=1}}}return a?.pluginId??"native"}function _a(e={}){let n=e.performance??globalThis.performance,t=Zt(),a=new Map,i=[],o=kt();if(e.localStorage===void 0)try{typeof localStorage<"u"&&(e={...e,localStorage})}catch{}if(e.location===void 0)try{typeof location<"u"&&(e={...e,location})}catch{}let d=e.forceEnabled!==void 0?e.forceEnabled===!0:null,x=null,w=!0,u=e.hostSnapshotProvider??null,c=null,l=null,m=null;o.startedAt=he(n);let g=(f,b,y)=>{for(f.push(y);f.length>b;)f.shift()},T=f=>{let b=f.startTime??0,y=f.duration??0,v=typeof f.processingStart=="number"&&f.processingStart>0?f.processingStart:b,L=typeof f.processingEnd=="number"&&f.processingEnd>=v?f.processingEnd:v;return{inputDelay:Math.max(0,v-b),processing:Math.max(0,L-v),presentation:Math.max(0,y-(L-b))}},R=f=>{let b=f.interactionId??0;if(b===0)return;let y=String(b),v=o.pendingInteractions.get(y);if(v===void 0){v={interactionId:b,start:f.startTime,duration:f.duration??0,target:f.target??null,...T(f)},o.pendingInteractions.set(y,v);return}v.start=Math.min(v.start,f.startTime),(f.duration??0)>=v.duration&&(v.duration=f.duration??0,v.target=f.target??v.target,Object.assign(v,T(f)))},P=f=>{for(let[y,v]of o.pendingInteractions){if(v.start+v.duration+8>f)continue;o.pendingInteractions.delete(y);let z=La(a,v.target,t),M=Aa(v.target,za),ge=sn(v,o.spanEvents,o.trackEvents);on(o,{interactionId:v.interactionId,start:v.start,duration:v.duration,inputDelay:v.inputDelay??0,processing:v.processing??0,presentation:v.presentation??0,owner:z,bucket:M,samples:ge});let ie=a.get(z);if(ie!==void 0&&z!=="native"){ie.own.interactions.push(v.duration);continue}for(let[ce,ye]of Object.entries(ge)){let pe=a.get(ce);pe!==void 0&&(pe.samples.spans+=ye.spans,pe.samples.callbacks+=ye.callbacks,ye.spanMs>0&&pe.native.spanMs.push(ye.spanMs),ye.trackMs>0&&pe.native.trackMs.push(ye.trackMs))}}let b=he(n)-6e4;o.spanEvents=o.spanEvents.filter(y=>y.end>=b),o.trackEvents=o.trackEvents.filter(y=>y.at>=b)},A=f=>{o.loafCount+=1,o.blockingMs+=f.blockingDuration??0;let b=!1;for(let y of f.scripts??[]){o.forcedLayoutMs+=y.forcedStyleAndLayoutDuration??0;let v=Et(y.sourceURL??"");if(v.length!==0)if(b=!0,v.length===1){let L=rn(v[0]);L!==null&&o.pluginScriptMs.set(L,(o.pluginScriptMs.get(L)??0)+(y.duration??0))}else o.nanoScriptMs+=y.duration??0}b&&(o.nanoLoafCount+=1,o.nanoBlockingMs+=f.blockingDuration??0)},F=f=>{let b=f.name??"";if(!(f.initiatorType==="script"||/\.js(?:[?&]|$)/.test(b)))return;let v=f.encodedBodySize??0;o.resources.totalJsBytes+=v,Et(b).length!==0&&(o.resources.nanoClientJsBytes+=v,b.includes("/plugins/??")&&(o.resources.comboResources+=1))},B=()=>{if(x!==null)return;x={installed:!0};let f=e.PerformanceObserver??globalThis.PerformanceObserver;if(typeof f!="function"){w=!1,t.observerErrors+=1;return}let b=(y,v)=>{try{let L=new f(z=>{try{for(let M of z.getEntries())v(M);P(he(n))}catch{t.observerErrors+=1}});return L.observe({type:y,buffered:!0,durationThreshold:16}),L}catch{return t.observersMissing+=1,null}};x.event=b("event",R),x.loaf=b("long-animation-frame",A),x.loaf===null&&(w=!1),x.resource=b("resource",F),x.event===null&&x.loaf===null&&x.resource===null&&(t.observerErrors+=1)},$=()=>{if(m!==null)return;let f=e.setInterval??globalThis.setInterval;typeof f=="function"&&(m=f(()=>{try{P(he(n))}catch{t.observerErrors+=1}},250),typeof m?.unref=="function"&&m.unref())},G=()=>(d===null&&(d=Pa(e)),d===!0&&x===null&&(B(),$()),d),j=(f,b,y,v,L)=>{let z=tn(f,t,y);if(z!==null){Qt(z,L-v),g(o.spanEvents,Ma,{start:v,end:L,pluginId:b,name:y});try{n.measure?.(`nano:${b}:${y}`,{start:v,end:L})}catch{}}},Z=(f,b)=>({span(y,v){if(!Ve.test(y))return t.badNames+=1,v();let L=he(n),z;try{z=v()}catch(M){throw j(b,f,y,L,he(n)),M}return Ba(z)?z.finally(()=>j(b,f,y,L,he(n))):(j(b,f,y,L,he(n)),z)},track(y,v,L={}){let z=an(b,t,v,y);return{name:v,kind:y,wrap(M){return z===null?M:(...ge)=>{let ie=he(n);try{return M(...ge)}finally{let ce=he(n)-ie;z.callbacks+=1,z.totalCallbacks=(z.totalCallbacks??0)+1,z.callbackMs+=ce,z.totalCallbackMs=(z.totalCallbackMs??0)+ce,g(o.trackEvents,Da,{at:ie,ms:ce,pluginId:f,name:v})}}},attach(M=1){z!==null&&(z.live+=M)},detach(M=1){z!==null&&(z.live=Math.max(0,z.live-M))},resetLive(){z!==null&&(z.live=0)}}},count(y,v=1){nn(b,t,y,v)&&o.counts.set(y,(o.counts.get(y)??0)+v)},profiler(y){let v=b._react;if(v==null||typeof v.Profiler!="function")return y;let L=(...z)=>{let M=z[2];for(b.profiler.commits+=1,b.profiler.durations.push(M??0);b.profiler.durations.length>Ia;)b.profiler.durations.shift()};return function(M){return v.createElement(v.Profiler,{id:`nano:${f}:root`,onRender:L},v.createElement(y,M))}}}),S=()=>({span(f,b){return b()},track(f,b){return{name:b,kind:f,wrap:y=>y,attach(){},detach(){},resetLive(){}}},count(){},profiler(f){return f}}),N=(f,b={})=>{G();let y=en(a,f);return i.push({pluginId:f,libVersion:b.libVersion??Le}),b.version!=null&&(y.meta.version=b.version),y.meta.implantedAt==null&&(y.meta.implantedAt=new Date().toISOString()),typeof b.root=="function"&&(y._root=b.root),b.react!=null&&(y._react=b.react),d?Z(f,y):S()},k=()=>{let f=o.counts,b=o.resources;o=kt(),o.counts=f,o.resources=b,o.startedAt=he(n);for(let y of a.values()){y.own.interactions=[],y.native.spanMs=[],y.native.trackMs=[],y.samples={spans:0,callbacks:0};for(let v of y.spans.values())v.window=[];for(let v of y.tracks.values())v.callbacks=0,v.callbackMs=0;y.profiler.durations=[]}};return{join:N,report:(f={},b=null)=>{P(he(n)+6e4);let y=[],v=new Set;for(let ie of i){let ce=`${ie.pluginId}@${ie.libVersion}`;v.has(ce)||(v.add(ce),y.push(ie))}let L=e.navigator??globalThis.navigator,z=/Chrome\/(\d+)/.exec(L?.userAgent??""),M=b??(typeof u=="function"?u():c),ge=ln({meta:{generatedAt:new Date().toISOString(),chromeMajor:z===null?null:Number(z[1]),observerVersion:Le,contributors:y,...f},collector:o,plugins:a,structure:t,hostSnapshot:M??null,enabled:d===!0,loafSupported:w});return M!=null&&cn(ge,M),k(),ge},configure:(f={})=>{if(typeof f.hostSnapshotProvider=="function"){u=f.hostSnapshotProvider;return}if(typeof f.hostSnapshotUrl!="string"||u!==null||l!==null||d!==!0)return;let b=e.fetch??globalThis.fetch,y=e.setInterval??globalThis.setInterval;if(typeof b!="function"||typeof y!="function")return;let v=()=>{try{Promise.resolve(b(f.hostSnapshotUrl,{credentials:"same-origin",cache:"no-store"})).then(L=>L?.json?.()).then(L=>{L!==null&&typeof L=="object"&&(c=L)}).catch(()=>{})}catch{}};v(),l=y(v,5e3),typeof l?.unref=="function"&&l.unref()},setHostSnapshotProvider:f=>{u=typeof f=="function"?f:null},reset:k,resetCounters:()=>{o.counts.clear();for(let f of a.values())f.usage.clear()},_state:()=>({collector:o,plugins:a,structure:t,enabled:d,loafSupported:w,contributors:i}),_finalizeDue:P,_absorbEventEntry:R,_absorbLoafEntry:A,_absorbResourceEntry:F,libVersion:Le}}function at(e={}){let n=e.global??globalThis;return n.__perfReview==null&&(n.__perfReview=_a(e)),n.__perfReview}typeof window<"u"&&typeof document<"u"&&at();var Ua="nano-explorer-extra",Ha=()=>pn(document.querySelectorAll("[data-nxe]")),ae=at().join(Ua,{version:"0.1.1",libVersion:Le,react:fn.default,root:Ha});at().configure({hostSnapshotUrl:"/nano-explorer-extra/perf-review/host?mode=snapshot"});var{useState:hn}=le.default;function _e(e){return Ke(),le.default.useEffect(()=>{ae.count("dialog-open")},[]),le.default.createElement(ke,e)}function Ke(e=!0){le.default.useEffect(()=>{if(!e)return;let n=!0,t=(B,$)=>{for(let[G,j]of Object.entries($))B.style[G]!==j&&(B.style[G]=j)},a=()=>{let B=null,$=0;for(let G of document.querySelectorAll("[data-nxe]")){let j=G.closest("[data-sidebar-right-pane]")??G;if(!(j instanceof HTMLElement))continue;let Z=j.getBoundingClientRect(),S=Z.width*Z.height;S>$&&(B=j,$=S)}return B},i=null,o=null,d=()=>document.querySelector('.nano-dialog-card [class*="nxe-"]')!==null,x=()=>{if(!n||!d())return;let B=a();if(!(B instanceof HTMLElement))return;B!==i&&typeof ResizeObserver=="function"&&(o?.disconnect(),i=B,o=new ResizeObserver(x),o.observe(B));let $=B.getBoundingClientRect();if(!($.width<1||$.height<1))for(let G of document.querySelectorAll(".nano-dialog-card")){if(G.querySelector('[class*="nxe-"]')===null)continue;let j=G.parentElement;if(j instanceof HTMLElement&&(j.classList.add("nxe-confined-layer"),t(j,{position:"fixed",top:`${$.top}px`,left:`${$.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${$.width}px`,height:`${$.height}px`,padding:"12px"}),G.querySelector(".nxe-scm")!==null)){G.dataset.nxeFill="1";let Z=B.getAttribute("data-theme");Z&&G.setAttribute("data-theme",Z),t(j,{display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",overflow:"hidden"}),t(G,{position:"relative",top:"auto",left:"auto",right:"auto",transform:"none"});let S=G.querySelector("[data-nxe-scm]")?.getAttribute("data-nxe-scm"),N=Math.max(240,$.height-24);if(S==="commit"){let k=`${Math.min(Math.round(window.innerHeight*.5),N)}px`;t(G,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:k,minHeight:k,maxHeight:k,display:"flex",flexDirection:"column",overflow:"hidden"})}else t(G,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:"auto",minHeight:"0",maxHeight:`${Math.min(N,Math.round($.height*.68))}px`,display:"",flexDirection:"",overflow:""})}}},w=null,u=0,c=!1,l=ae.track("mutation","card-shape"),m=ae.track("raf","card-follow"),g=ae.track("mutation","card-wake"),T=()=>{c&&(l.detach(),m.detach(),c=!1),w!==null&&(w.disconnect(),w=null),u!==0&&(window.cancelAnimationFrame(u),u=0),o?.disconnect(),o=null,i=null,window.removeEventListener("resize",x)},R=B=>{for(let $ of B)for(let G of $.addedNodes)if(G instanceof Element&&(G.matches(".nano-dialog-card, .nano-dialog-card *")||G.querySelector(".nano-dialog-card")!==null))return!0;return!1},P=m.wrap(()=>{if(u=0,!!n){if(!d()){T();return}x(),u=window.requestAnimationFrame(P)}}),A=()=>{c||!n||!d()||(c=!0,w=new MutationObserver(l.wrap(B=>{R(B)&&x()})),w.observe(document.body,{childList:!0,subtree:!0}),l.attach(),m.attach(),window.addEventListener("resize",x),x(),u=window.requestAnimationFrame(P))},F=new MutationObserver(g.wrap(B=>{!n||c||!R(B)||A()}));return F.observe(document.body,{childList:!0,subtree:!0}),g.attach(),A(),()=>{n=!1,T(),F.disconnect(),g.detach();for(let B of document.querySelectorAll(".nxe-confined-layer")){B.classList.remove("nxe-confined-layer");for(let $ of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction","overflow"])B.style.removeProperty($)}for(let B of document.querySelectorAll("[data-nxe-fill]"))if(B instanceof HTMLElement){delete B.dataset.nxeFill;for(let $ of["width","max-width","height","max-height","min-height","min-width","margin","position","top","left","right","transform","display","flex-direction","overflow"])B.style.removeProperty($)}}},[e])}function mn({children:e}){return le.default.createElement("div",{className:"nxe-dialog-field"},e)}function gn({copy:e,files:n,busy:t,error:a,onConfirm:i,onCancel:o}){let[d,x]=hn(""),w=d.trim()==="";return le.default.createElement(_e,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:w,busy:t,error:a,onConfirm:()=>i(d),onCancel:o,description:e.commitBody(n.length)},le.default.createElement(mn,null,le.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(u=>le.default.createElement("li",{key:u.path,title:u.path},`${u.status} ${u.path}`))),le.default.createElement(Tt.Input,{value:d,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:u=>x(u.currentTarget.value)})))}function Ct({copy:e,currentName:n,busy:t,error:a,onConfirm:i,onCancel:o,mode:d="rename"}){let[x,w]=hn(n),u=x.trim()==="",c=d==="create";return le.default.createElement(_e,{copy:e,title:c?e.newEntryTitle:e.renameTitle,confirmLabel:c?e.create:e.confirm,busy:t,error:a,confirmDisabled:u,onConfirm:()=>i(x),onCancel:o,description:c?e.newEntryBody(n):e.renameBody(n)},le.default.createElement(mn,null,le.default.createElement(Tt.Input,{value:x,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:l=>w(l.currentTarget.value),onKeyDown:l=>{l.key==="Enter"&&!u&&(l.preventDefault(),i(x))}})))}var p=se(J("react"),1),X=J("@deepseek-ai/dsh-client-ui-primitives");function qe(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,a=0;for(;t>=1024&&a<n.length-1;)t/=1024,a+=1;return`${a===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[a]}`}function xn(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function wn(e){let n=[],t=[],a=[],i=[];for(let o of e??[]){if(o?.status==="U"){i.push(o);continue}if(o?.status==="?"){a.push(o);continue}o?.staged&&n.push({...o,status:o.staged}),o?.unstaged?t.push({...o,status:o.unstaged}):o?.staged||t.push(o)}return{staged:n,unstaged:t,untracked:a,conflicts:i}}function bn(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function Rt(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function vn(e,n,t){let a=new Map(e),i=n===""?"":`${n}/`;for(let o of a.keys())(i===""||o===n||o.startsWith(i))&&a.delete(o);for(let o of t)typeof o?.path=="string"&&o.path!==""&&a.set(o.path,o);return a}function yn(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let a=Math.floor(t/60);if(a<24)return{unit:"hours",value:a};let i=Math.floor(a/24);if(i<30)return{unit:"days",value:i};let o=new Date(e*1e3),d=x=>String(x).padStart(2,"0");return{unit:"date",value:`${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`}}var{useEffect:En,useState:rt}=p.default;function Wa(e,n){let t=yn(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function Sn(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function kn(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(a=>String(a??"").toLowerCase().includes(t))}function ja({file:e}){let{name:n,dir:t}=bn(e.path);return p.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},p.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),p.default.createElement(X.FileTypeIcon,{kind:(0,X.classifyFileType)(n),size:16,className:"nxe-change-icon"}),p.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:p.default.createElement("span",{className:"nxe-change-dir"},t)))}function $t({label:e,count:n,files:t,tone:a}){return t.length===0?null:p.default.createElement("section",{className:"nxe-scm-group","data-tone":a??"default"},p.default.createElement("h3",{className:"nxe-local-head","data-tone":a??"default"},p.default.createElement("span",null,e),p.default.createElement("span",{className:"nxe-local-badge"},String(n))),p.default.createElement("ul",{className:"nxe-drawer-list"},t.slice(0,400).map(i=>p.default.createElement(ja,{key:`${a??""}:${i.path}`,file:i}))))}function Ga({copy:e,history:n,currentBranch:t,upstream:a}){let i=n??[],o=a==null?-1:i.findIndex(d=>d.refs.includes(a));return p.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},p.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),i.length===0?p.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):p.default.createElement("ol",{className:"nxe-graph"},i.map((d,x)=>p.default.createElement("li",{key:`${d.hash}:${x}`,className:"nxe-graph-row","data-head":String(x===0),"data-ahead":String(o>=0&&x<o||o===-1&&a!=null),"data-boundary":String(o>=0&&x===o),title:[d.hash,Wa(e,d.time),d.subject].filter(w=>w!=="").join(" \xB7 ")},p.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},p.default.createElement("span",{className:"nxe-graph-dot"})),p.default.createElement("span",{className:"nxe-graph-subject"},p.default.createElement("span",{className:"nxe-graph-hash"},d.hash)," ",d.subject),p.default.createElement("span",{className:"nxe-graph-pills"},d.refs.slice(0,2).map(w=>p.default.createElement("span",{key:w,className:"nxe-pill","data-tone":w===t?"current":w===a?"upstream":"default",title:w},w)))))))}function Nn({copy:e,open:n,git:t,onClose:a,onPull:i,onRefresh:o,onCheckout:d,onOpenConflict:x,busy:w,error:u}){Ke(n);let[c,l]=rt(""),[m,g]=rt(null);if(En(()=>{n||(l(""),g(null))},[n]),!n)return null;let T=Sn(t),R=t?.upstream??null,P=t?.behind??0,A=t?.ahead??0,F=t?.history??[],B=[...t?.branches??[]].sort((S,N)=>S.current===!0&&N.current!==!0?-1:N.current===!0&&S.current!==!0?1:S.name.localeCompare(N.name)).filter(S=>kn(c,[S.name,S.upstream,S.commit])),$=(t?.worktrees??[]).filter(S=>kn(c,[S.branch,S.path,S.head,Rt(S.path)])),G=c.trim()!==""&&B.length===0&&$.length===0,j=t?.conflicts??[],Z=e.branchDrawerSummary(T??e.detached,R===null?e.noUpstream:`${R} \xB7 ${e.factSyncValue(P,A)}`,e.worktreesHeadingCount((t?.worktrees??[]).length));return p.default.createElement(ke,{copy:e,title:e.branchDrawerTitle,description:j.length===0?Z:`${Z} \xB7 ${e.factConflicted(j.length)}`,error:u,footer:p.default.createElement(p.default.Fragment,null,p.default.createElement(X.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:a},e.cancel),p.default.createElement(X.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{o()}},e.refreshGit),R===null?null:p.default.createElement(X.Button,{variant:"primary",className:"nano-modal-action",disabled:w===!0||P===0,title:P===0?e.pullNothing:e.pullNow,onClick:()=>{i()}},P>0?`${e.pullNow} ${P}`:e.pullNow)),onCancel:a},p.default.createElement("div",{className:"nxe-scm nxe-repo","data-nxe-scm":"branch"},j.length===0?null:p.default.createElement("section",{className:"nxe-repo-conflict","data-nxe-conflicts":String(j.length)},p.default.createElement("p",{className:"nxe-repo-conflict-title"},p.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!")," ",e.factConflicted(j.length)),p.default.createElement("p",{className:"nxe-drawer-empty"},e.branchConflictBlocks),p.default.createElement("ul",{className:"nxe-drawer-list nxe-repo-conflict-list"},j.map(S=>p.default.createElement("li",{key:S,className:"nxe-change","data-status":"U"},p.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),p.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:S,onClick:()=>x?.(S)},S))))),p.default.createElement(Ga,{copy:e,history:F,currentBranch:T,upstream:R}),p.default.createElement(X.Input,{value:c,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:S=>l(S.currentTarget.value)}),G?p.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):p.default.createElement(p.default.Fragment,null,p.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(B.length)),B.length===0?p.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):p.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},B.map(S=>p.default.createElement("li",{key:S.name,className:"nxe-drawer-row","data-current":String(S.current===!0),"data-blocked":String(S.inOtherWorktree===!0)},p.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:S.current===!0||S.inOtherWorktree===!0||w===!0||j.length>0,title:j.length>0?e.branchConflictBlocks:S.inOtherWorktree===!0?e.branchHeldElsewhere:S.name,onClick:()=>g(S.name),"data-nxe-checkout":S.name},S.name),S.commit===""?null:p.default.createElement("span",{className:"nxe-graph-hash"},S.commit),S.upstream===null?null:p.default.createElement("span",{className:"nxe-drawer-row-path",title:S.upstream},S.upstream),j.length>0&&S.current===!0?p.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"danger"},"!"):null,S.inOtherWorktree===!0?p.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):S.current===!0?p.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),p.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount($.length)),$.length===0?p.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):p.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},$.map(S=>{let N=S.path===t?.root,k=S.detached?e.detached:S.branch??e.detached,I=typeof S.head=="string"?S.head.slice(0,7):"";return p.default.createElement("li",{key:S.path,className:"nxe-worktree","data-current":String(N),title:S.path},p.default.createElement("span",{className:"nxe-worktree-mark","data-current":String(N),"aria-hidden":"true"}),p.default.createElement("span",{className:"nxe-worktree-body"},p.default.createElement("span",{className:"nxe-worktree-line"},p.default.createElement("span",{className:"nxe-worktree-branch"},k),I===""?null:p.default.createElement("span",{className:"nxe-graph-hash"},I),N?p.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),p.default.createElement("span",{className:"nxe-worktree-path"},Rt(S.path))))})))),m===null?null:p.default.createElement(_e,{copy:e,title:e.checkoutTitle(m),description:e.checkoutBody(m),confirmLabel:e.checkoutConfirm,busy:w,onConfirm:()=>{let S=m;g(null),d(S)},onCancel:()=>g(null)},p.default.createElement("p",{className:"nxe-drawer-empty"},e.checkoutBody(m))))}function Tn({copy:e,open:n,git:t,onClose:a,onCommit:i,busy:o,error:d,refreshing:x,onOpenConflict:w}){Ke(n);let[u,c]=rt(""),[l,m]=rt("all");if(En(()=>{n||m("all")},[n]),!n)return null;let g=t?.files??[],T=wn(g),R=T.conflicts.length>0?T.conflicts:(t?.conflicts??[]).map($=>({path:$,status:"U"})),P=g.length,A=Sn(t),F=P>0&&R.length===0&&u.trim()!==""&&o!==!0,B=()=>{F&&Promise.resolve(i(u)).then($=>{$===!0&&c("")})};return p.default.createElement(ke,{copy:e,title:p.default.createElement("span",{className:"nxe-drawer-title"},e.commitDrawerTitle,x===!0?p.default.createElement(X.IconLoadingOutlineRegular,{width:15,height:15,className:"nxe-drawer-spin","aria-label":e.commitRefreshing??"refreshing",role:"status"}):null),description:e.commitDrawerBody(P,A??(t?.detached?e.detached:null)),error:d,footer:p.default.createElement(p.default.Fragment,null,p.default.createElement(X.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:a},e.cancel),p.default.createElement(X.Button,{variant:"primary",className:"nano-modal-action",disabled:!F,onClick:B},e.commit)),onCancel:a},p.default.createElement("div",{className:"nxe-scm nxe-local","data-nxe-scm":"commit"},p.default.createElement(X.Input,{value:u,placeholder:A===null?e.commitPlaceholder:e.commitPlaceholderOn(A),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:$=>c($.currentTarget.value),onKeyDown:$=>{$.key==="Enter"&&($.metaKey||$.ctrlKey)&&($.preventDefault(),B())}}),p.default.createElement("div",{className:"nxe-local-filters",role:"group","aria-label":e.filterChanges},[{id:"all",label:e.filterAll,count:P},{id:"staged",label:e.localStaged,count:T.staged.length},{id:"unstaged",label:e.localUnstaged,count:T.unstaged.length},{id:"untracked",label:e.localUntracked,count:T.untracked.length},...R.length===0?[]:[{id:"conflict",label:e.localConflicts,count:R.length}]].map($=>p.default.createElement(X.Button,{key:$.id,variant:l===$.id?"primary":"outline",className:"nxe-local-filter",disabled:$.id!=="all"&&$.count===0,"aria-pressed":String(l===$.id),onClick:()=>m($.id)},`${$.label} ${$.count}`))),l!=="all"&&l!=="conflict"||R.length===0?null:p.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},p.default.createElement("h3",{className:"nxe-local-head","data-tone":"danger"},p.default.createElement("span",null,e.localConflicts),p.default.createElement("span",{className:"nxe-local-badge"},String(R.length))),p.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),p.default.createElement("ul",{className:"nxe-drawer-list"},R.map($=>p.default.createElement("li",{key:$.path,className:"nxe-change","data-status":"U"},p.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),p.default.createElement(X.FileTypeIcon,{kind:(0,X.classifyFileType)($.path),size:16,className:"nxe-change-icon"}),p.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:$.path,onClick:()=>w($.path)},$.path))))),P===0?p.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):p.default.createElement(p.default.Fragment,null,l==="all"||l==="staged"?p.default.createElement($t,{label:e.localStaged,count:T.staged.length,files:T.staged,tone:"staged"}):null,l==="all"||l==="unstaged"?p.default.createElement($t,{label:e.localUnstaged,count:T.unstaged.length,files:T.unstaged,tone:"unstaged"}):null,l==="all"||l==="untracked"?p.default.createElement($t,{label:e.localUntracked,count:T.untracked.length,files:T.untracked,tone:"untracked"}):null)))}function Va(e){if(e==="")return null;let n=[];for(let t of e.split(`
`)){let a;t.startsWith("@@")?a="hunk":t.startsWith("+")?a="added":t.startsWith("-")?a="removed":t.startsWith("diff ")||t.startsWith("index ")||t.startsWith("--- ")||t.startsWith("+++ ")||t.startsWith("rename ")||t.startsWith("similarity ")||t.startsWith("old mode")||t.startsWith("new mode")||t.startsWith("deleted file")||t.startsWith("new file")?a="meta":a="context",n.push({line:t,tone:a})}return n}function Cn({copy:e,view:n,onClose:t}){let a=n!==null;if(Ke(a),!a)return null;let i=n.state==="ready"?Va(n.diff):null;return p.default.createElement(ke,{copy:e,title:`${e.viewDiffTitle} \xB7 ${n.name}`,description:n.path,error:n.state==="error"?n.message??e.viewDiffFailed:void 0,footer:p.default.createElement(X.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:t},e.cancel),onCancel:t},n.state==="loading"?p.default.createElement("p",{className:"nxe-drawer-empty"},e.loading):i===null?p.default.createElement("p",{className:"nxe-drawer-empty"},e.viewDiffEmpty):p.default.createElement("pre",{className:"nxe-diff","data-nxe-diff":"true"},i.map((o,d)=>p.default.createElement("span",{key:d,className:"nxe-diff-line","data-tone":o.tone},`${o.line}
`))))}var ee=se(J("react"),1),In=J("@deepseek-ai/dsh-client-ui-primitives");var $n="dsh-nano-explorer-extra:prefs.v2",Ka="dsh-nano-explorer-extra:prefs.v1",Ue={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function On(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Rn(e){let n=On(e)?e:{},t={};for(let[a,i]of Object.entries(Ue))t[a]=typeof n[a]=="boolean"?n[a]:i;return t}function Dn(){try{let e=window.localStorage?.getItem($n);if(e!=null)return Rn(JSON.parse(e));let n=window.localStorage?.getItem(Ka);if(n==null)return{...Ue};let t=JSON.parse(n),a=On(t)?{...t}:{};return delete a.openPreviewOnClick,delete a.openPreviewOnDoubleClick,Rn(a)}catch{return{...Ue}}}function Mn(e){try{window.localStorage?.setItem($n,JSON.stringify(e))}catch{}}function Re({label:e,hint:n,checked:t,onChange:a,warn:i}){return ee.default.createElement("div",{className:"nxe-settings-row"},ee.default.createElement("div",null,ee.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:ee.default.createElement("div",{className:"nxe-settings-hint"},n),i===!0?ee.default.createElement("p",{className:"nxe-warn"},n):null),ee.default.createElement(In.Switch,{checked:t,label:e,onChange:a}))}function Bn({copy:e,open:n,prefs:t,setPref:a,onClose:i}){if(!n)return null;let o=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return ee.default.createElement(ke,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:i,onConfirm:i},ee.default.createElement(Re,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:d=>a("openPreviewOnClick",d)}),ee.default.createElement(Re,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:d=>a("openPreviewOnDoubleClick",d)}),o?ee.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,ee.default.createElement(Re,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:d=>a("showOpenButton",d)}),ee.default.createElement(Re,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:d=>a("showIgnoredBadge",d)}),ee.default.createElement(Re,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:d=>a("showGitStatus",d)}),ee.default.createElement(Re,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:d=>a("showSystemFiles",d)}),ee.default.createElement(Re,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:d=>a("showStatusBar",d)}),ee.default.createElement(Re,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:d=>a("statsExcludeGit",d)}))}var we=se(J("react"),1),He=J("@deepseek-ai/dsh-client-ui-primitives");function Pn(e){return function({entry:t}){let a=e.copy(),i=e.statusOf(t.path),o=e.ignoredOf(t.path),d=e.linkOf(t.path),x=e.linkBrokenOf(t.path)===!0,w=t.meta?.kind!=="directory",u=w?void 0:e.folderStatusOf(t.path),c=e.showGit()&&!o,l=c?e.stagedOf(t.path):void 0,m=c?e.unstagedOf(t.path):void 0,g=c?e.remoteOf(t.path):void 0;return we.default.createElement("span",{className:"nxe-acc",...o?{"data-nxe-ignored":"true"}:{}},d===void 0?null:we.default.createElement("span",{className:"nxe-acc-link",title:x?a.linkBroken:d?a.symlinkOutsideBadge:a.symlinkBadge,"aria-label":x?a.linkBroken:d?a.symlinkOutsideBadge:a.symlinkBadge,"data-nxe-symlink":x?"broken":d?"outside":"inside"},we.default.createElement(He.IconLinkOutlineRegular,{width:14,height:14,"aria-hidden":"true"})),g===void 0?null:we.default.createElement("span",{className:"nxe-acc-remote","data-status":g.status,"data-direction":g.direction,title:g.direction==="pulled"?a.remotePulled(g.status):a.remotePushed(g.status),"aria-label":g.direction==="pulled"?a.remotePulled(g.status):a.remotePushed(g.status)},`${g.direction==="pulled"?"\u2193":"\u2191"}${g.status}`),c&&i!==void 0?we.default.createElement("span",{className:"nxe-acc-letter","data-status":i,"data-staged":l===void 0?"false":"true",title:e.statusLabel(i,l,m),"aria-label":e.statusLabel(i,l,m)},i):null,c&&u!==void 0?we.default.createElement("span",{className:"nxe-acc-dot","data-status":u,title:e.statusLabel(u),"aria-label":e.statusLabel(u)}):null,o&&e.showIgnoredBadge()?we.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:a.ignoredBadge,"aria-label":a.ignoredBadge},we.default.createElement(He.IconCloseCircleFillRegular,{width:14,height:14,"aria-hidden":"true"})):null,w&&e.showOpenButton()?we.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:a.openFile,"aria-label":`${a.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:T=>{T.stopPropagation(),e.open(t)}},we.default.createElement(He.IconRightUpOutlineRegular,{width:12,height:12,"aria-hidden":"true"})):null)}}var _=se(J("react"),1);var re=J("@deepseek-ai/dsh-client-ui-primitives");function Ot({icon:e,value:n,title:t,scope:a}){return _.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":a},e,_.default.createElement("span",{className:"nxe-figure-value"},n))}function An(e){let{copy:n,git:t,stats:a,statsState:i,prefs:o,onOpenBranch:d,onOpenCommit:x}=e,w=(0,_.useRef)(null),[u,c]=(0,_.useState)(!1),l=(0,_.useRef)(0);if((0,_.useEffect)(()=>{let T=w.current;if(!T)return;let R=()=>{let A=T.clientWidth;T.scrollWidth>A+1?(l.current=T.scrollWidth,c(!0)):u&&A>=l.current+32&&c(!1)};R();let P=new ResizeObserver(R);return P.observe(T),()=>P.disconnect()},[u]),!o.showStatusBar)return null;let m=[];if(t==null)m.push(_.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},_.default.createElement(re.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),_.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let T=t.detached?n.detached:t.branch??n.detached,R=t.files?.length??0,P=t.conflicts?.length??0,A=R>0;m.push(_.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(A),"data-conflicted":String(P>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(T,A,P),"aria-label":n.branchButtonTooltip(T,A,P),onClick:d},_.default.createElement(re.IconBranchOutlineRegular,{width:14,height:14}),_.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},T),A?_.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,P>0?_.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&m.push(_.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},_.default.createElement(re.IconArchiveOutlineRegular,{width:14,height:14}),_.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let F=t.upstream===null||t.upstream===void 0?void 0:xn(t.ahead??0,t.behind??0);m.push(_.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(R),title:n.commitButtonTooltip(R,F===void 0?null:F),"aria-label":n.commitButtonTooltip(R,F===void 0?null:F),onClick:x},_.default.createElement(re.IconRefreshOutlineRegular,{width:14,height:14}),F===void 0?null:_.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},F),_.default.createElement("span",{className:"nxe-chip-badge","data-nxe-pending":String(R),"data-empty":String(R===0)},String(R))))}let g=[];if(!u){if(i==="loading")g.push(_.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(i==="failed")g.push(_.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(a!=null){let T=a.truncated?"+":"",R=o.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";g.push(_.default.createElement(Ot,{key:"dirs",scope:"directories",icon:_.default.createElement(re.IconFolderCloseRegular,{width:14,height:14}),value:`${a.directories}${T}`,title:n.statsTooltip(a.files,a.directories,qe(a.bytes))+R})),g.push(_.default.createElement(Ot,{key:"files",scope:"files",icon:_.default.createElement(re.IconDeliverDocRegular,{width:14,height:14}),value:`${a.files}${T}`,title:n.statsTooltip(a.files,a.directories,qe(a.bytes))+R})),g.push(_.default.createElement(Ot,{key:"bytes",scope:"bytes",icon:_.default.createElement(re.IconGaugeOutlineRegular,{width:14,height:14}),value:qe(a.bytes),title:n.statsSizeTooltip(qe(a.bytes))+R}))}}return g.push(_.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},_.default.createElement(re.IconSettingsOutlineRegular,{width:14,height:14}))),_.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true","data-crowded":String(u),ref:w},_.default.createElement("div",{className:"nxe-status-left"},m),_.default.createElement("div",{className:"nxe-status-right"},g))}var zn=se(J("react"),1);function Fn({menu:e,actions:n,onClose:t}){return zn.default.createElement(bt,{menu:e,actions:n,onClose:t})}var K=se(J("@deepseek-ai/dsh-client-ui-primitives"),1);function be(e,n){let t=Ee(e),a=String(n??"").replace(/\\/gu,"/");return a===""?t:a.startsWith("/")||/^[A-Za-z]:\//u.test(a)?Ee(a):`${t==="/"?"":t}/${a}`.replace(/\/{2,}/gu,"/")}function oe(e,n){return Ee(be(e,n))}function qa(e,n){let t=Ee(e),a=Ee(n);return t===a?!0:a.startsWith(t==="/"?"/":`${t}/`)}function ue(e,n){let t=Ee(e),a=Ee(n);return a===t?"":qa(t,a)?a.slice(t==="/"?1:t.length+1):a}function $e(e){let n=Ee(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Pe(e){let n=Ee(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function Ee(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var Ja=5*60*1e3,Ya=20*1e3,Xa=2e3,Dt=new Map;async function Je(e,n){try{let t=await fetch(`/nano-explorer-extra${e}`,{method:n===void 0?"GET":"POST",headers:n===void 0?void 0:{"content-type":"application/json"},body:n===void 0?void 0:JSON.stringify(n),credentials:"same-origin",cache:"no-store"}),a=await t.json().catch(()=>({error:`HTTP ${t.status}`}));return t.ok?{ok:!0,...a}:{ok:!1,message:a?.error??`HTTP ${t.status}`}}catch(t){return{ok:!1,message:t instanceof Error?t.message:String(t)}}}function Qa(e){let n=new Set,t=new Set,a=new Map,i={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},o=0,d=0,x=0,w=0,u=()=>!0,c=N=>ae.span("apply-status",()=>{i={...i,...N};for(let k of n)k()}),l=(N,k)=>{let I=a.get(N);if(I!==void 0)return I;let D=k().finally(()=>{a.get(N)===D&&a.delete(N)});return a.set(N,D),D},m=(N,k,I=!1)=>l(`level:${k}`,()=>ae.span("list-level",async()=>{let D=oe(e,k);if(!I){let b=new Map(i.levels);b.get(D)===void 0&&b.set(D,{loading:!0,entries:[]}),b!==i.levels&&c({levels:b})}let H=await Je("/list",{sessionId:N,path:k});w=Date.now();let U=new Map(i.levels),f=U.get(D);return H.ok?U.set(D,{entries:H.entries,truncated:H.truncated===!0,outside:H.outside===!0,failed:f?.failed===!0&&f.entries?.length>0?f.failed:!1}):U.set(D,{entries:f?.entries??[],failed:!0,message:H.message,code:H.code}),c({levels:U}),(H.code==="not-found"||H.code==="not-directory")&&k!==e&&Z(k),H.ok&&H.entries.length>0&&g(N,k,H.entries.map(b=>b.name)),H})),g=(N,k,I)=>!u()||!Array.isArray(I)||I.length===0?Promise.resolve():l(`ignored:${k}:${I.join(",")}`,async()=>{let D=await Je("/ignored",{sessionId:N,paths:I});if(!D.ok||!Array.isArray(D.ignored)||D.ignored.length===0)return;let H=new Set(i.ignoredSet),U=ue(e,k);for(let f of D.ignored)H.add(U===""?f:`${U}/${f}`);c({ignoredSet:H})}),T=(N,k)=>u()?l(`dirstatus:${k}:${o}`,()=>ae.span("dir-status",async()=>{let I=o,D=await Je(`/status?sessionId=${encodeURIComponent(N)}&path=${encodeURIComponent(k)}`);if(I!==o||!D.ok||D.git===null||D.git===void 0)return;let H=D.git.root,U=H??e,f=ue(U,k);if(f===k&&f!=="")return;let b=[];for(let y of D.git.files??[]){let v=H===void 0?y.path:`${H.replace(/\/+$/u,"")}/${y.path}`,L=ue(U,v);L!==v&&b.push({...y,path:L})}c({directoryStatus:vn(i.directoryStatus,f,b)})})):Promise.resolve(),R=N=>u()?l("git",()=>ae.span("git-refresh",async()=>{let k=o+1;o=k;let I=await Je(`/status?sessionId=${encodeURIComponent(N)}`);if(k===o){if(!I.ok){c({gitError:I.message});return}c({git:I.git??null,gitError:I.gitError,directoryStatus:new Map});for(let D of i.expanded)T(N,D)}})):((i.git!==null||i.gitError!==void 0||i.directoryStatus.size!==0)&&c({git:null,gitError:void 0,directoryStatus:new Map}),Promise.resolve()),P=N=>l("stats",()=>ae.span("stats-count",async()=>{c({statsState:"loading"});let k=await Je(`/status?sessionId=${encodeURIComponent(N)}&only=stats`);if(!k.ok){c({statsState:"failed"});return}c({stats:k.stats??null,statsState:"ok"})})),A=N=>{clearTimeout(d),d=setTimeout(()=>{P(N)},Xa)},F=(N,k,I)=>{let D=oe(e,k),H=i.expanded.has(D),U=new Set(i.expanded);I?U.add(D):U.delete(D),(U.size!==i.expanded.size||![...U].every(f=>i.expanded.has(f)))&&c({expanded:U}),I&&!H&&ae.count("files-expand"),I&&i.levels.get(D)===void 0&&m(N,k)},B=N=>{let k=[...i.expanded];m(N,e,!0);for(let I of k)m(N,I,!0);w=Date.now()},$=(N,k)=>m(N,k,!0),G=N=>{let k=oe(e,N);if(i.levels.has(k))return;let I=new Map(i.levels);I.set(k,{entries:[]}),c({levels:I})},j=N=>{let k=oe(e,N);if(!i.levels.has(k))return;let I=new Map(i.levels);I.delete(k),c({levels:I})},Z=N=>{let k=oe(e,N),I=new Map;for(let[f,b]of i.levels)f!==k&&!f.startsWith(`${k}/`)&&I.set(f,b);let D=new Set;for(let f of i.expanded)f!==k&&!f.startsWith(`${k}/`)&&D.add(f);let H=oe(e,$e(k)),U=I.get(H);if(U?.entries!==void 0){let f=Pe(k),b=U.entries.filter(y=>y.name!==f);b.length!==U.entries.length&&I.set(H,{...U,entries:b})}c({levels:I,expanded:D})};return{root:e,get state(){return i},subscribe:N=>(n.add(N),()=>n.delete(N)),mountCount:()=>t.size,mount:N=>{clearTimeout(x),typeof N?.showGitStatus=="function"&&(u=N.showGitStatus);let k={};return t.add(k),i.levels.size===0?m(N.sessionId,e):Date.now()-w>Ya&&B(N.sessionId),k},unmount:N=>{t.delete(N),t.size===0&&(x=setTimeout(()=>Dt.delete(e),Ja))},loadLevel:m,markIgnored:g,loadDirectoryStatus:T,refreshGit:R,refreshStats:P,queueStats:A,toggle:F,refresh:B,refreshLevel:$,knownEmpty:G,forget:j,collapseUnder:N=>{let k=oe(e,N),I=new Set;for(let H of i.expanded)H!==k&&!H.startsWith(`${k}/`)&&I.add(H);let D=new Map;for(let[H,U]of i.levels)H!==k&&!H.startsWith(`${k}/`)&&D.set(H,U);c({expanded:I,levels:D})},dismissGitError:()=>{i.gitError!==void 0&&c({gitError:void 0})}}}function Ln(e){let n=Dt.get(e);if(n!==void 0)return n;let t=Qa(e);return Dt.set(e,t),t}var Za=".md";function _n(e,n){let t=e==="file"?"untitled":"new-folder",a=new Set((n??[]).map(o=>String(o.name??"").toLowerCase())),i=o=>e==="file"?`${t}${o===1?"":`-${o}`}${Za}`:`${t}${o===1?"":`-${o}`}`;for(let o=1;o<1e4;o+=1){let d=i(o);if(!a.has(d.toLowerCase()))return d}throw new Error("cannot find an unused name")}function Un(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:W,useEffect:Oe,useMemo:me,useRef:Ae,useState:ne,useSyncExternalStore:Hn}=C.default,er=400,tr=15e3,Wn={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},nr={levels:new Map,entries:[],directories:{},expanded:[],selected:null,setSelected:()=>{},loadLevel:()=>Promise.resolve(),refreshLevel:()=>Promise.resolve(),toggle:()=>{},refresh:()=>Promise.resolve(),forget:()=>{},collapseUnder:()=>{},knownEmpty:()=>{},pending:null,setPending:()=>{}},ar=["U","D","M","A","R","?"],rr=new Set([".git",".DS_Store"]);function jn(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function Gn(e){let{useTabInfo:n,sessionId:t,useSessions:a,renderSlot:i,renderFactorySlot:o,useContextMenu:d,nxe:x}=e,{tab:w,panel:u}=n(),c=a(r=>r.byId[t]?.cwd),l=x.copy,m=Hn(x.subscribePrefs,x.getPrefs,x.getPrefs),g=me(()=>c===void 0?null:Ln(c),[c]),T=Hn(W(r=>g?.subscribe(r)??(()=>{}),[g]),W(()=>g?.state??Wn,[g]),()=>Wn),{git:R,gitError:P,stats:A,statsState:F,ignoredSet:B,directoryStatus:$}=T,[G,j]=ne(null),[Z,S]=ne(null),[N,k]=ne(!1),[I,D]=ne(void 0),[H,U]=ne(void 0),[f,b]=ne(void 0),[y,v]=ne([]);Oe(()=>{let r=!0;return(async()=>{try{let s=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!s.ok)return;let h=await s.json(),O=Array.isArray(h.apps)?h.apps:[];r&&v(O.filter(V=>typeof V=="string"))}catch{}})(),()=>{r=!1}},[]);let[L,z]=ne(null),[M,ge]=ne(null),[ie,ce]=ne(null),[ye,pe]=ne(null),[Jn,Ye]=ne(null),[Yn,lt]=ne(!1),[Bt,ze]=ne(!1),[Pt,ve]=ne(void 0),[Xn,ct]=ne(!1),De=Ae(0);Oe(()=>{pe(null),ve(void 0),ct(!1),lt(!1),S(null),D(void 0),z(null),ce(null),ge(null),Ye(null)},[t,c,w.visible]);let At=Ae({path:"",at:0}),Xe=Ae(m);Xe.current=m;let Y=W(async(r,s)=>{try{let h=await fetch(`/nano-explorer-extra${r}`,{method:s===void 0?"GET":"POST",headers:s===void 0?void 0:{"content-type":"application/json"},body:s===void 0?void 0:JSON.stringify(s),credentials:"same-origin",cache:"no-store"}),O=await h.json().catch(()=>({error:`HTTP ${h.status}`}));return h.ok?{ok:!0,...O}:{ok:!1,message:O?.error??`HTTP ${h.status}`}}catch(h){return{ok:!1,message:h instanceof Error?h.message:String(h)}}},[]);Oe(()=>{if(g===null)return;let r=g.mount({sessionId:t,showGitStatus:()=>Xe.current.showGitStatus});return()=>g.unmount(r)},[g,t]);let zt=me(()=>{let r=[];for(let[s,h]of T.levels)for(let O of h.entries??[]){let V=s===""?O.name:`${s}/${O.name}`;r.push({...O,path:V})}return r},[T.levels]),Ft=me(()=>{let r={};for(let[s,h]of T.levels)h.loading===!0&&(h.entries?.length??0)===0?r[s]={loading:!0}:h.failed===!0?r[s]={failure:h.message}:h.truncated===!0&&(r[s]={truncated:!0});return r},[T.levels]),E=me(()=>g===null?nr:{levels:T.levels,entries:zt,directories:Ft,expanded:[...T.expanded],selected:G,setSelected:j,loadLevel:(r,s)=>g.loadLevel(t,r,s),refreshLevel:r=>g.refreshLevel(t,r),toggle:(r,s)=>g.toggle(t,r,s),refresh:()=>Promise.resolve(g.refresh(t)),forget:r=>g.forget(r),collapseUnder:r=>g.collapseUnder(r),knownEmpty:r=>g.knownEmpty(r),pending:null,setPending:()=>{}},[g,T.levels,T.expanded,zt,Ft,G,t]),te=W(()=>g?.refreshGit(t)??Promise.resolve(),[g,t]),xe=W(()=>g?.refreshStats(t)??Promise.resolve(),[g,t]),Lt=W(r=>{g?.loadDirectoryStatus(t,r)},[g,t]),_t=W(r=>{pe(r),ve(void 0),ct(!0),te().finally(()=>ct(!1))},[te]);Oe(()=>{te()},[te]),Oe(()=>{xe()},[xe]);let Ut=Ae(null);Oe(()=>{if(g===null)return;let r=ae.track("interval","git-poll"),s=window.setInterval(r.wrap(()=>{let h=Ut.current;h===null||h.closest('[hidden], [aria-hidden="true"]')!==null||g.refreshGit(t)}),tr);return r.attach(),()=>{window.clearInterval(s),r.detach()}},[g,t]);let Se=W(()=>{g?.queueStats(t)},[g,t]);Oe(()=>()=>{window.clearTimeout(De.current)},[]);let Qn=me(()=>{let r=new Map;for(let s of E.entries)s.symlink===!0&&r.set(s.path,{outside:s.outside===!0});return r},[E.entries]),dt=me(()=>Array.isArray(R?.files)?R.files:[],[R]),ut=me(()=>{let r=new Map;for(let s of dt)r.set(s.path,s);return r},[dt]),Qe=R?.root,Ne=me(()=>{if($.size===0)return ut;let r=new Map(ut);for(let[s,h]of $)r.set(s,h);return r},[ut,$]),fe=W(r=>{if(Qe==null)return;let s=be(c??"",r);return ue(Qe,s)},[Qe,c]),pt=W(r=>{let s=fe(r);if(s===void 0)return!1;if(B.has(s))return!0;let h=s.split("/");for(let O=h.length-1;O>0;O-=1)if(B.has(h.slice(0,O).join("/")))return!0;return!1},[B,fe]),Ze=W(r=>{let s=fe(r);if(s!==void 0)return Ne.get(s)?.status},[Ne,fe]),Zn=W(r=>{let s=fe(r);if(s!==void 0)return Ne.get(s)?.staged},[Ne,fe]),ea=W(r=>{let s=fe(r);if(s!==void 0)return Ne.get(s)?.unstaged},[Ne,fe]),Ht=me(()=>{let r=new Map;for(let s of R?.remote?.pushed??[])r.set(s.path,{status:s.status,direction:"pushed"});for(let s of R?.remote?.pulled??[])r.set(s.path,{status:s.status,direction:"pulled"});return r},[R]),ta=W(r=>{let s=fe(r);if(s!==void 0)return Ht.get(s)},[Ht,fe]),Me=W(r=>{let s=be(c??"",r.path),h=c??"",O=ue(h,s),Q=h!==""&&O!==s?`dsh-resource://file/session/${encodeURIComponent(t)}/${jn(O)}`:`dsh-resource://file/absolute/${jn(s.replace(/^\/+/,""))}`;u.isFloating?w.actions.openResource(Q):w.actions.openResource(Q,{paneId:u.id})},[c,t,w.actions,u.id,u.isFloating]),ft=W(async r=>{let s=await E.loadLevel(r.path);E.toggle(r.path,!0),s?.ok&&Lt(r.path)},[E,Lt]),na=W(async r=>{k(!0);let s=await Y("/delete",{sessionId:t,path:r.path,kind:r.kind==="directory"?"directory":"file"});if(k(!1),!s.ok){U(s.message);return}ce(null),U(void 0),E.forget(r.path),E.collapseUnder(r.path);let h=$e(r.path);h!==r.path&&await E.refreshLevel(h),E.selected===r.path&&E.setSelected(null),Se()},[t,Y,E,Se]),Wt=W(r=>{if(c===void 0)return;let s=or(E,c),h=ir(E,c,s);U(void 0),z({kind:r,directory:s,proposed:_n(r,h)})},[c,E]),aa=W(async r=>{if(L===null)return;let{kind:s,directory:h}=L,O=Un(r,l);if(!O.ok){U(O.message);return}k(!0);let V=await Y(s==="file"?"/create-file":"/create-folder",{sessionId:t,directory:h,name:O.name});if(k(!1),!V.ok){U(V.message);return}z(null),U(void 0),await E.refreshLevel(h);let Q=ue(c??"",h),Fe=be(c??"",`${Q===""?"":`${Q}/`}${O.name}`);E.setSelected(Fe),s==="folder"&&(E.knownEmpty(Fe),E.toggle(Fe,!0)),Se()},[L,l,c,t,Y,E,Se]),ra=W(async(r,s)=>{if(c===void 0)return;let h=be(c,r.path),O=r.meta?.kind==="directory"?"directory":"file";k(!0),D(void 0);let V=await Y("/rename",{sessionId:t,path:h,name:s,kind:O});if(k(!1),!V.ok){D(V.message);return}S(null);let Q=$e(h);await E.refreshLevel(Q),O==="directory"&&E.collapseUnder(h),E.setSelected(be(c,`${ue(c,Q)===""?"":`${ue(c,Q)}/`}${s.trim()}`)),Se()},[c,t,Y,E,Se]),ht=W(async(r,s)=>{if(c===void 0)return;let h=be(c,r.path),O=await Y("/move",{sessionId:t,path:h,directory:s});if(!O.ok){b(O.message),window.clearTimeout(De.current),De.current=window.setTimeout(()=>b(void 0),4e3);return}let V=$e(h);await E.refreshLevel(V),await E.refreshLevel(s),r.meta?.kind==="directory"&&E.collapseUnder(h),E.selected===h&&E.setSelected(O.path),Se(),te()},[c,t,Y,E,Se,te]),oa=W(async r=>{k(!0),D(void 0);let s=await Y("/commit",{sessionId:t,message:r});if(k(!1),!s.ok){D(s.message);return}S(null),await E.refresh(),await te(),await xe()},[t,Y,E,te,xe]),jt=W(async()=>{ze(!0),ve(void 0);let r=await Y("/pull",{sessionId:t});if(ze(!1),!r.ok){ve(r.message);return}await E.refresh(),await te(),await xe()},[t,Y,E,te,xe]),ia=W(async r=>{ze(!0),ve(void 0);let s=await Y("/checkout",{sessionId:t,branch:r});if(ze(!1),!s.ok){ve(s.message);return}b(l.branchSwitched(r)),window.clearTimeout(De.current),De.current=window.setTimeout(()=>b(void 0),2e3),await E.refresh(),await te(),await xe()},[t,Y,E,te,xe,l]),sa=W(async r=>{ze(!0),ve(void 0);let s=await Y("/commit",{sessionId:t,message:r});return ze(!1),s.ok?(await E.refresh(),await te(),await xe(),!0):(ve(s.message),!1)},[t,Y,E,te,xe]),mt=W(async(r,s)=>{try{await navigator.clipboard.writeText(s||r),b(l.copied),window.clearTimeout(De.current),De.current=window.setTimeout(()=>b(void 0),1600)}catch(h){U(h instanceof Error?h.message:String(h))}},[l.copied]),gt=Ae(0),Te=Ae(null),xt=Ae("file"),Ce=W(()=>{window.clearTimeout(gt.current),gt.current=0,Te.current!==null&&Te.current.removeAttribute("data-nxe-drop"),Te.current=null},[]),et=W((r,s)=>{Ce(),Te.current=s,s.setAttribute("data-nxe-drop","true"),r!==null&&!E.expanded.includes(r.path)&&(gt.current=window.setTimeout(()=>{ft(r)},650))},[Ce,ft,E.expanded]),wt=W(r=>(r.preventDefault(),r.stopPropagation(),Ce(),r.dataTransfer?.getData("application/x-nxe-move")??""),[Ce]),la=W((r,s)=>({draggable:!0,onDragStart:h=>{xt.current=s,h.dataTransfer?.setData("application/x-nxe-move",r.path),h.dataTransfer&&(h.dataTransfer.effectAllowed="move")},onDragEnd:Ce,onContextMenu:h=>{h.preventDefault(),h.stopPropagation(),E.setSelected(r.path),ae.count("menu-open"),ge({x:h.clientX,y:h.clientY,path:r.path,name:r.name,kind:s,openedAt:Date.now()})},onDragOver:s==="directory"?h=>{h.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(h.preventDefault(),h.stopPropagation(),h.dataTransfer.dropEffect="move",Te.current!==h.currentTarget&&et(r,h.currentTarget))}:void 0,onDragEnter:s==="directory"?h=>{h.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(h.currentTarget.contains(h.relatedTarget)||et(r,h.currentTarget))}:void 0,onDragLeave:s==="directory"?h=>{h.relatedTarget instanceof Node&&h.currentTarget.contains(h.relatedTarget)||Te.current===h.currentTarget&&Ce()}:void 0,onDrop:s==="directory"?h=>{let O=wt(h);O!==""&&ht({path:O,meta:{kind:xt.current}},r.path)}:void 0}),[E,Ce,et,wt,ht]),ca=W(r=>{let s=fe(r);if(s===void 0)return;let h=s===""?"":`${s}/`,O,V=-1;for(let[Q,Fe]of Ne){if(h!==""&&!Q.startsWith(h))continue;let Vt=ar.indexOf(Fe.status);Vt>V&&(V=Vt,O=Fe.status)}return O},[Ne,fe]),Gt=me(()=>Pn({copy:()=>l,statusOf:Ze,stagedOf:Zn,unstagedOf:ea,remoteOf:ta,ignoredOf:pt,folderStatusOf:ca,linkBrokenOf:r=>E.levels.get(oe(c??"",r))?.code==="broken-link",linkOf:r=>{let s=Qn.get(r);if(s!==void 0)return s.outside===!0},showGit:()=>m.showGitStatus,showIgnoredBadge:()=>m.showIgnoredBadge,showOpenButton:()=>m.showOpenButton,statusLabel:r=>x.statusLabel(l,r),open:r=>Me(r)}),[l,Ze,pt,E.levels,c,m.showGitStatus,m.showIgnoredBadge,m.showOpenButton,x,Me]),da=me(()=>({slots:{accessory:Gt},fallback:null}),[Gt]);if(c===void 0)return C.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},l.noWorkspace);let ua=E.entries.filter(r=>m.showSystemFiles||!rr.has(r.name)).map(r=>({path:r.path,name:r.name,meta:{kind:r.type==="directory"?"directory":r.type==="file"?"file":"other",...r.symlink===!0?{link:!0}:{},...r.outside===!0?{outside:!0}:{},...pt(r.path)?{hidden:!0}:{}}})),pa=o("sidebar.files.tree",{root:oe(c,c),entries:ua,expanded:E.expanded,directories:E.directories,current:E.selected===null?void 0:oe(c,E.selected),onToggle:r=>{if(E.expanded.includes(r.path)){E.toggle(r.path,!1);return}ft(r)},onOpen:r=>{E.setSelected(r.path);let s=Date.now(),h=At.current,O=h.path===r.path&&s-h.at<=er;At.current={path:r.path,at:s},(O?Xe.current.openPreviewOnDoubleClick:Xe.current.openPreviewOnClick)&&Me(r)},rowTriggerProps:la,canOpen:()=>!0},da);Oe(()=>{let r=s=>{D(void 0),S({kind:"rename",entry:{path:s.path,name:Pe(s.path),meta:{kind:s.kind}}})};return x.setRenameHandler(r),()=>x.setRenameHandler(void 0)},[x]);let fa=W(r=>{if(E.pending!==null)return;if(r.key==="F2"&&E.selected!==null){r.preventDefault(),D(void 0),S({kind:"rename",entry:{path:E.selected,name:Pe(E.selected),meta:{kind:E.levels.has(E.selected)?"directory":"file"}}});return}let s=E.selected;if(s===null)return;let h=oe(c??"",s),O=E.levels.has(h)||E.expanded.includes(h);if(r.key===" "){if(!O)return;r.preventDefault(),E.toggle(s,!E.expanded.includes(h));return}if(r.key==="Enter"){if(r.preventDefault(),O){E.toggle(s,!E.expanded.includes(h));return}Me({path:h,name:Pe(s),meta:{kind:"file"}})}},[E,c,Me]),ha=Z===null?null:Z.kind==="commit"?C.default.createElement(gn,{copy:l,files:dt,busy:N,error:I,onConfirm:oa,onCancel:()=>{S(null),D(void 0)}}):C.default.createElement(Ct,{copy:l,currentName:Z.entry.name,busy:N,error:I,onConfirm:r=>ra(Z.entry,r),onCancel:()=>{S(null),D(void 0)}}),ma=me(()=>{if(M===null)return[];let r={path:M.path,name:M.name,kind:M.kind},s=y[0],h=O=>{let V=be(c??"",M.path),Q=M.kind==="directory"?V:$e(V);fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:O,path:Q}),credentials:"same-origin"})};return[s===void 0?null:{id:"reveal",label:l.revealIn(it[s]??s),icon:C.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(s)}`,alt:"",width:14,height:14}),run:()=>{h(s)}},{id:"copy-path",label:l.copyAbsolute,icon:C.default.createElement(K.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{mt(M.path,M.path)}},{id:"copy-relative",label:l.copyRelative,icon:C.default.createElement(K.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{mt(M.path,ue(c??"",M.path))}},M.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:l.openInNotepad,icon:C.default.createElement(K.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let O=await Y("/read",{sessionId:t,path:M.path});if(!O.ok){U(O.message??l.openInNotepadFail);return}U(void 0);let V=M.path.startsWith("/")?M.path:`${c??""}/${M.path}`;await window.__nanoNotepad.import(M.name,O.content,{sourcePath:V})}},M.kind!=="file"||Ze(M.path)===void 0?null:{id:"view-diff",label:l.viewDiff,icon:C.default.createElement(K.IconCompareSplitOutlineRegular,{width:14,height:14}),run:()=>{let O=M.path;Ye({path:O,name:M.name,state:"loading"}),Y("/diff",{sessionId:t,path:O}).then(V=>{Ye(Q=>Q?.path===O?V.ok?{...Q,state:"ready",diff:V.diff??""}:{...Q,state:"error",message:V.message}:Q)})}},{id:"rename",label:l.rename,icon:C.default.createElement(K.IconEditOutlineRegular,{width:14,height:14}),run:()=>{D(void 0),S({kind:"rename",entry:{...r,meta:{kind:M.kind}}})}},{id:"delete",label:l.delete,tone:"danger",icon:C.default.createElement(K.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{U(void 0),ce(r)}}].filter(Boolean)},[M,l,y,c,mt,Ze,Y,t]);return C.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":x.scheme(),ref:Ut},C.default.createElement("div",{className:"nxe-header"},C.default.createElement("span",{className:"nxe-path",title:c,"data-nxe-path":"true"},c),C.default.createElement(ot,{label:l.newFile,onClick:()=>{Wt("file")}},ur()),C.default.createElement(ot,{label:l.newFolder,onClick:()=>{Wt("folder")}},pr()),C.default.createElement(ot,{label:l.rename,disabled:E.selected===null,onClick:()=>{let r=E.selected;r!==null&&(D(void 0),S({kind:"rename",entry:{path:r,name:Pe(r),meta:{kind:E.levels.has(r)?"directory":"file"}}}))}},hr()),C.default.createElement(mr,{copy:l,cwd:c??"",apps:y}),C.default.createElement(ot,{label:l.reload,onClick:()=>{E.refresh(),te()}},fr())),H===void 0?null:C.default.createElement("p",{className:"nxe-row-note",role:"status"},H),ie===null?null:C.default.createElement(_e,{copy:l,title:l.deleteTitle,busy:N,confirmLabel:l.delete,onConfirm:()=>{na(ie)},onCancel:()=>{ce(null),U(void 0)},description:C.default.createElement(C.default.Fragment,null,l.deleteBody(ie.name),ie.kind==="directory"?C.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${l.deleteFolderNote}`):null)}),L===null?null:C.default.createElement(Ct,{copy:l,mode:"create",busy:N,currentName:L.proposed,onConfirm:r=>{aa(r)},onCancel:()=>{z(null),U(void 0)}}),C.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:fa,onDragOver:r=>{r.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(r.preventDefault(),r.dataTransfer.dropEffect="move",Te.current!==r.currentTarget&&et(null,r.currentTarget))},onDragLeave:r=>{r.relatedTarget instanceof Node&&r.currentTarget.contains(r.relatedTarget)||Te.current===r.currentTarget&&Ce()},onDrop:r=>{let s=wt(r);s!==""&&ht({path:s,meta:{kind:xt.current}},c)}},pa),C.default.createElement(vt,{text:f}),P===void 0?null:C.default.createElement("div",{className:"nano-toast nxe-git-alert",role:"alert","data-nxe-git-alert":"true"},C.default.createElement(K.IconWarningOutlineRegular,{width:14,height:14,className:"nxe-git-alert-icon","aria-hidden":"true"}),C.default.createElement("span",{className:"nxe-git-alert-text"},P),C.default.createElement("button",{type:"button",className:"nxe-git-alert-x",title:l.dismiss,"aria-label":l.dismiss,onClick:()=>g?.dismissGitError()},C.default.createElement(K.IconCloseOutlineRegular,{width:12,height:12,"aria-hidden":"true"}))),C.default.createElement(An,{copy:l,git:R,stats:A,statsState:F,prefs:m,onOpenBranch:()=>_t("branch"),onOpenCommit:()=>_t("commit"),onRetryStats:()=>{xe()},onOpenSettings:()=>lt(!0)}),ha,C.default.createElement(Bn,{copy:l,open:Yn,prefs:m,onClose:()=>lt(!1),setPref:(r,s)=>x.setPref(r,s)}),C.default.createElement(Nn,{copy:l,open:ye==="branch",git:R,busy:Bt,error:Pt,onClose:()=>{pe(null),ve(void 0)},onPull:jt,onCheckout:ia,onRefresh:async()=>{await te()},onOpenConflict:r=>{Me({path:be(c??"",r)}),pe(null)}}),C.default.createElement(Tn,{copy:l,open:ye==="commit",git:R,busy:Bt,error:Pt,refreshing:Xn,onClose:()=>{pe(null),ve(void 0)},onCommit:sa,onPull:jt,onOpenConflict:r=>{Me({path:be(c??"",r)}),pe(null)}}),C.default.createElement(Cn,{copy:l,view:Jn,onClose:()=>Ye(null)}),C.default.createElement(Fn,{menu:M,copy:l,actions:ma,onClose:()=>ge(null)}))}function ot({label:e,onClick:n,children:t,disabled:a}){return C.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:a===!0},t)}function or(e,n){let t=e.selected;if(t===null)return n;let a=oe(n,t);return e.levels.has(a)?a:$e(a)}function ir(e,n,t){return e.levels.get(oe(n,t))?.entries??[]}var sr=K.IconPlusOutlineRegular,lr=K.IconFolderCloseRegular,cr=K.IconEditOutlineRegular,dr=K.IconRefreshOutlineRegular;function ur(){return C.default.createElement(sr,{width:16,height:16})}function pr(){return C.default.createElement(lr,{width:16,height:16})}function fr(){return C.default.createElement(dr,{width:16,height:16})}function hr(){return C.default.createElement(cr,{width:16,height:16})}function mr({copy:e,cwd:n,apps:t}){let a=Array.isArray(t)?t:[];if(n===""||a.length===0)return null;let[i,o]=C.default.useState(a[0]),[d,x]=C.default.useState(!1),w=C.default.useRef(null),u=a.includes(i)?i:a[0];C.default.useEffect(()=>{if(!d)return;let l=g=>{w.current!==null&&!w.current.contains(g.target)&&x(!1)},m=g=>{g.key==="Escape"&&x(!1)};return document.addEventListener("pointerdown",l,!0),document.addEventListener("keydown",m,!0),()=>{document.removeEventListener("pointerdown",l,!0),document.removeEventListener("keydown",m,!0)}},[d]);let c=l=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:l,path:n}),credentials:"same-origin"})};return C.default.createElement("span",{className:"nxe-reveal",ref:w,"data-nxe-reveal":u},C.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(it[u]??u),"aria-label":e.revealIn(it[u]??u),onClick:()=>{c(u)}},C.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(u)}`,alt:"",width:14,height:14})),C.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),C.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(d),onClick:()=>x(l=>!l)},C.default.createElement(K.IconChevronDownOutlineRegular,{width:10,height:10,"aria-hidden":"true"})),d?C.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},a.map(l=>C.default.createElement("button",{key:l,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{o(l),x(!1),c(l)}},C.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},C.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(l)}`,alt:"",width:14,height:14})),C.default.createElement("span",{className:"nano-menu-label"},it[l]??l)))):null)}var it={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var gr={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0 Git \u72B6\u6001",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",viewDiff:"\u67E5\u770B\u5DEE\u5F02",viewDiffTitle:"\u5DEE\u5F02",viewDiffEmpty:"\u6CA1\u6709\u53EF\u663E\u793A\u7684\u5DEE\u5F02",viewDiffFailed:"\u8BFB\u53D6\u5DEE\u5F02\u5931\u8D25",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",dismiss:"\u5173\u95ED",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`\u4ED3\u5E93 \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitRefreshing:"\u6B63\u5728\u8BFB\u53D6\u6700\u65B0\u72B6\u6001",commitDrawerBody:(e,n)=>n?`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${n} \xB7 ${e} \u5904\u6539\u52A8`:`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${e} \u5904\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchConflictBlocks:"\u8FD9\u4E9B\u6587\u4EF6\u8FD8\u5728\u51B2\u7A81\u4E2D\u3002\u89E3\u51B3\u4E4B\u524D\uFF0C\u8FD9\u5F20\u5361\u7247\u91CC\u7684\u5207\u6362\u5206\u652F\u4E0D\u4F1A\u6267\u884C\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,checkoutTitle:e=>`\u5207\u6362\u5230 ${e}\uFF1F`,checkoutBody:e=>`\u5F53\u524D\u5DE5\u4F5C\u6811\u4F1A\u6539\u5230\u5206\u652F ${e}\u3002\u672A\u63D0\u4EA4\u7684\u66F4\u6539\u5982\u679C\u4F1A\u88AB\u8986\u76D6\uFF0C\u5207\u6362\u4F1A\u88AB\u62D2\u7EDD\u3002`,checkoutConfirm:"\u5207\u6362",worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u63D0\u4EA4\u56FE",localStaged:"\u5DF2\u6682\u5B58",localUnstaged:"\u672A\u6682\u5B58",localUntracked:"\u672A\u8DDF\u8E2A",localConflicts:"\u51B2\u7A81",filterChanges:"\u6309\u66F4\u6539\u7C7B\u578B\u7B5B\u9009",filterAll:"\u5168\u90E8",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Refresh Git status",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",viewDiff:"View diff",viewDiffTitle:"Diff",viewDiffEmpty:"No differences to show",viewDiffFailed:"Failed to load the diff",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",dismiss:"Dismiss",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`Repository \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitRefreshing:"Reading latest status",commitDrawerBody:(e,n)=>n?`Working tree \xB7 ${n} \xB7 ${e} changes`:`Working tree \xB7 ${e} changes`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchConflictBlocks:"These files are still in conflict. Branch switches in this card do nothing until they are resolved.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,checkoutTitle:e=>`Switch to ${e}?`,checkoutBody:e=>`This worktree will move to ${e}. If local changes would be overwritten, the switch is refused.`,checkoutConfirm:"Switch",worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"History",localStaged:"Staged",localUnstaged:"Unstaged",localUntracked:"Untracked",localConflicts:"Conflicts",filterChanges:"Filter by change type",filterAll:"All",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function xr(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function We(e){return gr[xr(e)]}function Vn(e,n,t,a){let i={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&a!==void 0?e.statusBoth(i):t!==void 0?e.statusStaged(i):a!==void 0?e.statusUnstaged(i):i}var Kn=`${yt}

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
.nxe-diff {
  margin: 0; padding: 8px 0; max-height: 340px; overflow: auto;
  font: 12px/18px var(--dsw-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1);
}
.nxe-diff-line { display: block; white-space: pre-wrap; overflow-wrap: anywhere; padding: 0 10px; }
.nxe-diff-line[data-tone="added"] { color: var(--nxe-git-added); background: var(--dsw-alias-green-bg, transparent); }
.nxe-diff-line[data-tone="removed"] { color: var(--nxe-git-deleted); background: var(--dsw-alias-red-bg, transparent); }
.nxe-diff-line[data-tone="hunk"] { color: var(--dsw-alias-label-brand, var(--dsw-alias-link)); }
.nxe-diff-line[data-tone="meta"] { color: var(--dsw-alias-label-tertiary); }
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
`;var je=se(J("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:st,useCallback:zo,useEffect:Fo,useState:Lo}=It.default,wr=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var br="files",Mt="nano-explorer-extra",qn={handler:void 0};function vr(){let e=Dn(),n=new Set;return{get:()=>e,set:t=>{e=t,Mn(e);for(let a of n)a()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function yr(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=Kn,document.head.append(n),e.effect(()=>()=>n.remove());let t=vr(),a=u=>e.sessions.list.getSnapshot().byId[u]?.cwd,i=u=>{qn.handler?.(u)},o=()=>e.locale.getSnapshot().active,d=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",x=()=>({copy:We(o()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:u=>t.subscribe(u),scheme:d,statusLabel:Vn,onListed:()=>{},setRenameHandler:u=>{qn.handler=u},setPref:(u,c)=>t.set({...t.get(),[u]:c})});e.effect(()=>e.sidebarRightTabs.register({id:Mt,kind:br,priority:"extension",keepMounted:!0,title:()=>We(o()).typeLabel,guide:[{id:"explorer",order:10,title:()=>We(o()).typeLabel,description:()=>We(o()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:Mt,inject:()=>({nxe:x()})},Gn)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:Mt},function({useTabInfo:c}){let{tab:l}=c();return st(It.default.Fragment,null,st(je.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),l.title)})),"nano-explorer-extra: files tab title");let w=e.get("contextMenus");if(w!=null)for(let u of["file","directory"])e.effect(()=>w.register({id:`nano-explorer-extra.${u}`,target:u,order:900,resolve:async c=>{let l=We(o()),m=c.sessionId===void 0?void 0:a(c.sessionId),g=m===void 0?c.path:ue(m,c.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:l.copyRelative,failureLabel:l.copyFailed,run:()=>kr(g)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:l.rename,failureLabel:l.renameFailed,run:()=>i?.({path:c.path,kind:u==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${u} menu`);e.slots.inject("contextMenu.icon",()=>{let u=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},Er),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},Sr)];return()=>{for(let c of u)c()}})}async function kr(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function Er(){return st(je.IconLinkOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}function Sr(){return st(je.IconEditOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}return ka(Nr);})();
		return __nxeExport;
	}
});
