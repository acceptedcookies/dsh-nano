window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var Jn=Object.create;var _e=Object.defineProperty;var Vn=Object.getOwnPropertyDescriptor;var Xn=Object.getOwnPropertyNames;var Qn=Object.getPrototypeOf,Zn=Object.prototype.hasOwnProperty;var H=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var ea=(e,n)=>{for(var t in n)_e(e,t,{get:n[t],enumerable:!0})},Ut=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let c of Xn(n))!Zn.call(e,c)&&c!==t&&_e(e,c,{get:()=>n[c],enumerable:!(r=Vn(n,c))||r.enumerable});return e};var V=(e,n,t)=>(t=e!=null?Jn(Qn(e)):{},Ut(n||!e||!e.__esModule?_e(t,"default",{value:e,enumerable:!0}):t,e)),ta=e=>Ut(_e({},"__esModule",{value:!0}),e);var Ia={};ea(Ia,{DEFAULT_PREFS:()=>Re,apply:()=>Oa,inject:()=>Ca});var St=V(H("react"),1);var x=V(H("react"),1);var X=V(H("react"),1),wt=H("@deepseek-ai/dsh-client-ui-primitives");var Ee=V(H("react"),1),Pe=H("@deepseek-ai/dsh-client-ui-primitives");function xe({copy:e,title:n,description:t,confirmLabel:r,confirmDisabled:c,busy:u,error:h,danger:g,footer:w,maxHeight:p,width:s,region:o,onConfirm:E,onCancel:b,children:N}){return Ee.default.createElement(Pe.Modal,{open:!0,onClose:b,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",p===void 0?"":"nano-dialog-capped",s===void 0?"":"nano-dialog-sized",o===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:w??Ee.default.createElement(Ee.default.Fragment,null,Ee.default.createElement(Pe.Button,{variant:"outline",className:"nano-modal-action",onClick:b},e.cancel),Ee.default.createElement(Pe.Button,{variant:g?"outline":"primary",className:g?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:c===!0||u===!0,onClick:E},r??e.confirm))},N,h===void 0?null:Ee.default.createElement("p",{className:"nano-dialog-error",role:"alert"},h))}var Se=V(H("react"),1),{useCallback:Ma,useEffect:Ht,useRef:Gt,useState:na}=Se.default;function ft({menu:e,actions:n,onClose:t,width:r=208}){let c=Gt(null),[u,h]=na(0),g=e===null?[]:n,w=g.length,p=Gt(g);p.current=g;let s=e===null?null:e.openedAt;if(Ht(()=>{s!==null&&h(0)},[s]),Ht(()=>{if(e===null)return;let N=v=>{c.current!==null&&!c.current.contains(v.target)&&t()},y=v=>{if(v.key==="Escape"){v.stopPropagation(),t();return}if(v.key==="ArrowDown"){v.preventDefault(),h(C=>(C+1)%w);return}if(v.key==="ArrowUp"){v.preventDefault(),h(C=>(C-1+w)%w);return}v.key==="Enter"&&(v.preventDefault(),t(),p.current[u]?.run())};return document.addEventListener("pointerdown",N,!0),document.addEventListener("keydown",y,!0),()=>{document.removeEventListener("pointerdown",N,!0),document.removeEventListener("keydown",y,!0)}},[e,u,w,t]),e===null||w===0)return null;let o=w*28+8,E=Math.min(e.x,(window.innerWidth||r)-r-8),b=Math.min(e.y,(window.innerHeight||o)-o-8);return Se.default.createElement("div",{className:"nano-menu",role:"menu",ref:c,style:{position:"fixed",left:`${Math.max(8,E)}px`,top:`${Math.max(8,b)}px`,minWidth:`${r}px`},"data-nano-menu":"true"},g.map((N,y)=>Se.default.createElement(jt,{key:N.id,item:N,index:y,active:y===u,onHover:h,onRun:t})))}function jt({item:e,index:n,active:t,onHover:r,onRun:c}){return Se.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>r(n),onClick:()=>{c(),e.run()}},e.icon===void 0?null:Se.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),Se.default.createElement("span",{className:"nano-menu-label"},e.label))}var Wt=V(H("react"),1);function gt({text:e}){return e==null?null:Wt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var xt=`
/* \u2500\u2500 anchored popup menu (NanoMenu, NanoMenuItem) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* \u2500\u2500 type tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Every shared surface reads from --nano-* custom properties so an owning
   plugin (e.g. the notepad) can retune typography by declaring them once on its
   own root. Each falls back to the shell default so nano-ui stays self-contained. */
.nano-menu { position: fixed; padding: 4px; display: flex; flex-direction: column; gap: 1px; z-index: 30;
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
.nano-menu-icon { display: inline-flex; flex: none; color: var(--dsw-alias-label-tertiary); }
.nano-menu-item[data-active="true"] .nano-menu-icon { color: inherit; }
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
`;var{useState:qt}=X.default;function De(e){return Ye(),X.default.createElement(xe,e)}function Ye(){X.default.useEffect(()=>{let e=!0,n=(y,v)=>{for(let[C,U]of Object.entries(v))y.style[C]!==U&&(y.style[C]=U)},t=()=>{let y=null,v=0;for(let C of document.querySelectorAll("[data-nxe]")){let U=C.closest("[data-sidebar-right-pane]")??C;if(!(U instanceof HTMLElement))continue;let F=U.getBoundingClientRect(),S=F.width*F.height;S>v&&(y=U,v=S)}return y},r=null,c=null,u=()=>document.querySelector('.nano-dialog-card [class*="nxe-"]')!==null,h=()=>{if(!e||!u())return;let y=t();if(!(y instanceof HTMLElement))return;y!==r&&typeof ResizeObserver=="function"&&(c?.disconnect(),r=y,c=new ResizeObserver(h),c.observe(y));let v=y.getBoundingClientRect();if(!(v.width<1||v.height<1))for(let C of document.querySelectorAll(".nano-dialog-card")){if(C.querySelector('[class*="nxe-"]')===null)continue;let U=C.parentElement;if(U instanceof HTMLElement&&(U.classList.add("nxe-confined-layer"),n(U,{position:"fixed",top:`${v.top}px`,left:`${v.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${v.width}px`,height:`${v.height}px`,padding:"12px"}),C.querySelector(".nxe-scm")!==null)){C.dataset.nxeFill="1";let F=y.getAttribute("data-theme");F&&C.setAttribute("data-theme",F),n(U,{display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",overflow:"hidden"}),n(C,{position:"relative",top:"auto",left:"auto",right:"auto",transform:"none"});let S=C.querySelector("[data-nxe-scm]")?.getAttribute("data-nxe-scm"),Z=Math.max(240,v.height-24);if(S==="commit"){let M=`${Math.min(Math.round(window.innerHeight*.5),Z)}px`;n(C,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:M,minHeight:M,maxHeight:M,display:"flex",flexDirection:"column",overflow:"hidden"})}else n(C,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:"auto",minHeight:"0",maxHeight:`${Math.min(Z,Math.round(v.height*.68))}px`,display:"",flexDirection:"",overflow:""})}}},g=null,w=0,p=!1,s=()=>{g!==null&&(g.disconnect(),g=null),w!==0&&(window.cancelAnimationFrame(w),w=0),c?.disconnect(),c=null,r=null,window.removeEventListener("resize",h),p=!1},o=y=>{for(let v of y)for(let C of v.addedNodes)if(C instanceof Element&&(C.matches(".nano-dialog-card, .nano-dialog-card *")||C.querySelector(".nano-dialog-card")!==null))return!0;return!1},E=()=>{if(w=0,!!e){if(!u()){s();return}h(),w=window.requestAnimationFrame(E)}},b=()=>{p||!e||!u()||(p=!0,g=new MutationObserver(y=>{o(y)&&h()}),g.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("resize",h),h(),w=window.requestAnimationFrame(E))},N=new MutationObserver(y=>{!e||p||!o(y)||b()});return N.observe(document.body,{childList:!0,subtree:!0}),b(),()=>{e=!1,s(),N.disconnect();for(let y of document.querySelectorAll(".nxe-confined-layer")){y.classList.remove("nxe-confined-layer");for(let v of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction","overflow"])y.style.removeProperty(v)}for(let y of document.querySelectorAll("[data-nxe-fill]"))if(y instanceof HTMLElement){delete y.dataset.nxeFill;for(let v of["width","max-width","height","max-height","min-height","min-width","margin","position","top","left","right","transform","display","flex-direction","overflow"])y.style.removeProperty(v)}}},[])}function Kt({children:e}){return X.default.createElement("div",{className:"nxe-dialog-field"},e)}function _t({copy:e,files:n,busy:t,error:r,onConfirm:c,onCancel:u}){let[h,g]=qt(""),w=h.trim()==="";return X.default.createElement(De,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:w,busy:t,error:r,onConfirm:()=>c(h),onCancel:u,description:e.commitBody(n.length)},X.default.createElement(Kt,null,X.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(p=>X.default.createElement("li",{key:p.path,title:p.path},`${p.status} ${p.path}`))),X.default.createElement(wt.Input,{value:h,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:p=>g(p.currentTarget.value)})))}function bt({copy:e,currentName:n,busy:t,error:r,onConfirm:c,onCancel:u,mode:h="rename"}){let[g,w]=qt(n),p=g.trim()==="",s=h==="create";return X.default.createElement(De,{copy:e,title:s?e.newEntryTitle:e.renameTitle,confirmLabel:s?e.create:e.confirm,busy:t,error:r,confirmDisabled:p,onConfirm:()=>c(g),onCancel:u,description:s?e.newEntryBody(n):e.renameBody(n)},X.default.createElement(Kt,null,X.default.createElement(wt.Input,{value:g,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:o=>w(o.currentTarget.value),onKeyDown:o=>{o.key==="Enter"&&!p&&(o.preventDefault(),c(g))}})))}var d=V(H("react"),1),K=H("@deepseek-ai/dsh-client-ui-primitives");function Ae(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,r=0;for(;t>=1024&&r<n.length-1;)t/=1024,r+=1;return`${r===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[r]}`}function Yt(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function Jt(e){let n=[],t=[],r=[],c=[];for(let u of e??[]){if(u?.status==="U"){c.push(u);continue}if(u?.status==="?"){r.push(u);continue}u?.staged&&n.push({...u,status:u.staged}),u?.unstaged?t.push({...u,status:u.unstaged}):u?.staged||t.push(u)}return{staged:n,unstaged:t,untracked:r,conflicts:c}}function Vt(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function vt(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function Xt(e,n,t){let r=new Map(e),c=n===""?"":`${n}/`;for(let u of r.keys())(c===""||u===n||u.startsWith(c))&&r.delete(u);for(let u of t)typeof u?.path=="string"&&u.path!==""&&r.set(u.path,u);return r}function Qt(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let r=Math.floor(t/60);if(r<24)return{unit:"hours",value:r};let c=Math.floor(r/24);if(c<30)return{unit:"days",value:c};let u=new Date(e*1e3),h=g=>String(g).padStart(2,"0");return{unit:"date",value:`${u.getFullYear()}-${h(u.getMonth()+1)}-${h(u.getDate())}`}}var{useEffect:en,useState:Je}=d.default;function aa(e,n){let t=Qt(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function tn(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function Zt(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(r=>String(r??"").toLowerCase().includes(t))}function ra({file:e}){let{name:n,dir:t}=Vt(e.path);return d.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},d.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),d.default.createElement(K.FileTypeIcon,{kind:(0,K.classifyFileType)(n),size:16,className:"nxe-change-icon"}),d.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:d.default.createElement("span",{className:"nxe-change-dir"},t)))}function yt({label:e,count:n,files:t,tone:r}){return t.length===0?null:d.default.createElement("section",{className:"nxe-scm-group","data-tone":r??"default"},d.default.createElement("h3",{className:"nxe-local-head","data-tone":r??"default"},d.default.createElement("span",null,e),d.default.createElement("span",{className:"nxe-local-badge"},String(n))),d.default.createElement("ul",{className:"nxe-drawer-list"},t.slice(0,400).map(c=>d.default.createElement(ra,{key:`${r??""}:${c.path}`,file:c}))))}function ia({copy:e,history:n,currentBranch:t}){let r=n??[];return d.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},d.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),r.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):d.default.createElement("ol",{className:"nxe-graph"},r.map((c,u)=>d.default.createElement("li",{key:`${c.hash}:${u}`,className:"nxe-graph-row","data-head":String(u===0),title:[c.hash,aa(e,c.time),c.subject].filter(h=>h!=="").join(" \xB7 ")},d.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},d.default.createElement("span",{className:"nxe-graph-dot"})),d.default.createElement("span",{className:"nxe-graph-subject"},d.default.createElement("span",{className:"nxe-graph-hash"},c.hash)," ",c.subject),d.default.createElement("span",{className:"nxe-graph-pills"},c.refs.slice(0,2).map(h=>d.default.createElement("span",{key:h,className:"nxe-pill","data-tone":h===t?"current":"default",title:h},h)))))))}function nn({copy:e,open:n,git:t,onClose:r,onPull:c,onRefresh:u,onCheckout:h,onOpenConflict:g,busy:w,error:p}){Ye();let[s,o]=Je(""),[E,b]=Je(null);if(en(()=>{n||(o(""),b(null))},[n]),!n)return null;let N=tn(t),y=t?.upstream??null,v=t?.behind??0,C=t?.ahead??0,U=t?.history??[],F=[...t?.branches??[]].sort((f,ee)=>f.current===!0&&ee.current!==!0?-1:ee.current===!0&&f.current!==!0?1:f.name.localeCompare(ee.name)).filter(f=>Zt(s,[f.name,f.upstream,f.commit])),S=(t?.worktrees??[]).filter(f=>Zt(s,[f.branch,f.path,f.head,vt(f.path)])),Z=s.trim()!==""&&F.length===0&&S.length===0,M=t?.conflicts??[],de=e.branchDrawerSummary(N??e.detached,y===null?e.noUpstream:`${y} \xB7 ${e.factSyncValue(v,C)}`,e.worktreesHeadingCount((t?.worktrees??[]).length));return d.default.createElement(xe,{copy:e,title:e.branchDrawerTitle,description:M.length===0?de:`${de} \xB7 ${e.factConflicted(M.length)}`,error:p,footer:d.default.createElement(d.default.Fragment,null,d.default.createElement(K.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{u()}},e.refreshGit),y===null?null:d.default.createElement(K.Button,{variant:"primary",className:"nano-modal-action",disabled:w===!0||v===0,title:v===0?e.pullNothing:e.pullNow,onClick:()=>{c()}},v>0?`${e.pullNow} ${v}`:e.pullNow)),onCancel:r},d.default.createElement("div",{className:"nxe-scm nxe-repo","data-nxe-scm":"branch"},M.length===0?null:d.default.createElement("section",{className:"nxe-repo-conflict","data-nxe-conflicts":String(M.length)},d.default.createElement("p",{className:"nxe-repo-conflict-title"},d.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!")," ",e.factConflicted(M.length)),d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchConflictBlocks),d.default.createElement("ul",{className:"nxe-drawer-list nxe-repo-conflict-list"},M.map(f=>d.default.createElement("li",{key:f,className:"nxe-change","data-status":"U"},d.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),d.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:f,onClick:()=>g?.(f)},f))))),d.default.createElement(ia,{copy:e,history:U,currentBranch:N}),d.default.createElement(K.Input,{value:s,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:f=>o(f.currentTarget.value)}),Z?d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):d.default.createElement(d.default.Fragment,null,d.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(F.length)),F.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):d.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},F.map(f=>d.default.createElement("li",{key:f.name,className:"nxe-drawer-row","data-current":String(f.current===!0),"data-blocked":String(f.inOtherWorktree===!0)},d.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:f.current===!0||f.inOtherWorktree===!0||w===!0||M.length>0,title:M.length>0?e.branchConflictBlocks:f.inOtherWorktree===!0?e.branchHeldElsewhere:f.name,onClick:()=>b(f.name),"data-nxe-checkout":f.name},f.name),f.commit===""?null:d.default.createElement("span",{className:"nxe-graph-hash"},f.commit),f.upstream===null?null:d.default.createElement("span",{className:"nxe-drawer-row-path",title:f.upstream},f.upstream),M.length>0&&f.current===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"danger"},"!"):null,f.inOtherWorktree===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):f.current===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),d.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(S.length)),S.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):d.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},S.map(f=>{let ee=f.path===t?.root,_=f.detached?e.detached:f.branch??e.detached,ve=typeof f.head=="string"?f.head.slice(0,7):"";return d.default.createElement("li",{key:f.path,className:"nxe-worktree","data-current":String(ee),title:f.path},d.default.createElement("span",{className:"nxe-worktree-mark","data-current":String(ee),"aria-hidden":"true"}),d.default.createElement("span",{className:"nxe-worktree-body"},d.default.createElement("span",{className:"nxe-worktree-line"},d.default.createElement("span",{className:"nxe-worktree-branch"},_),ve===""?null:d.default.createElement("span",{className:"nxe-graph-hash"},ve),ee?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),d.default.createElement("span",{className:"nxe-worktree-path"},vt(f.path))))})))),E===null?null:d.default.createElement(De,{copy:e,title:e.checkoutTitle(E),description:e.checkoutBody(E),confirmLabel:e.checkoutConfirm,busy:w,onConfirm:()=>{let f=E;b(null),h(f)},onCancel:()=>b(null)},d.default.createElement("p",{className:"nxe-drawer-empty"},e.checkoutBody(E))))}function an({copy:e,open:n,git:t,onClose:r,onCommit:c,busy:u,error:h,refreshing:g,onOpenConflict:w}){Ye();let[p,s]=Je(""),[o,E]=Je("all");if(en(()=>{n||E("all")},[n]),!n)return null;let b=t?.files??[],N=Jt(b),y=N.conflicts.length>0?N.conflicts:(t?.conflicts??[]).map(S=>({path:S,status:"U"})),v=b.length,C=tn(t),U=v>0&&y.length===0&&p.trim()!==""&&u!==!0,F=()=>{U&&Promise.resolve(c(p)).then(S=>{S===!0&&s("")})};return d.default.createElement(xe,{copy:e,title:d.default.createElement("span",{className:"nxe-drawer-title"},e.commitDrawerTitle,g===!0?d.default.createElement(K.IconLoadingOutlineRegular,{width:15,height:15,className:"nxe-drawer-spin","aria-label":e.commitRefreshing??"refreshing",role:"status"}):null),description:e.commitDrawerBody(v,C??(t?.detached?e.detached:null)),error:h,footer:d.default.createElement(K.Button,{variant:"primary",className:"nano-modal-action",disabled:!U,onClick:F},e.commit),onCancel:r},d.default.createElement("div",{className:"nxe-scm nxe-local","data-nxe-scm":"commit"},d.default.createElement(K.Input,{value:p,placeholder:C===null?e.commitPlaceholder:e.commitPlaceholderOn(C),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:S=>s(S.currentTarget.value),onKeyDown:S=>{S.key==="Enter"&&(S.metaKey||S.ctrlKey)&&(S.preventDefault(),F())}}),d.default.createElement("div",{className:"nxe-local-filters",role:"group","aria-label":e.filterChanges},[{id:"all",label:e.filterAll,count:v},{id:"staged",label:e.localStaged,count:N.staged.length},{id:"unstaged",label:e.localUnstaged,count:N.unstaged.length},{id:"untracked",label:e.localUntracked,count:N.untracked.length},...y.length===0?[]:[{id:"conflict",label:e.localConflicts,count:y.length}]].map(S=>d.default.createElement(K.Button,{key:S.id,variant:o===S.id?"primary":"outline",className:"nxe-local-filter",disabled:S.id!=="all"&&S.count===0,"aria-pressed":String(o===S.id),onClick:()=>E(S.id)},`${S.label} ${S.count}`))),o!=="all"&&o!=="conflict"||y.length===0?null:d.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},d.default.createElement("h3",{className:"nxe-local-head","data-tone":"danger"},d.default.createElement("span",null,e.localConflicts),d.default.createElement("span",{className:"nxe-local-badge"},String(y.length))),d.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),d.default.createElement("ul",{className:"nxe-drawer-list"},y.map(S=>d.default.createElement("li",{key:S.path,className:"nxe-change","data-status":"U"},d.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),d.default.createElement(K.FileTypeIcon,{kind:(0,K.classifyFileType)(S.path),size:16,className:"nxe-change-icon"}),d.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:S.path,onClick:()=>w(S.path)},S.path))))),v===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):d.default.createElement(d.default.Fragment,null,o==="all"||o==="staged"?d.default.createElement(yt,{label:e.localStaged,count:N.staged.length,files:N.staged,tone:"staged"}):null,o==="all"||o==="unstaged"?d.default.createElement(yt,{label:e.localUnstaged,count:N.unstaged.length,files:N.unstaged,tone:"unstaged"}):null,o==="all"||o==="untracked"?d.default.createElement(yt,{label:e.localUntracked,count:N.untracked.length,files:N.untracked,tone:"untracked"}):null)))}var W=V(H("react"),1),cn=H("@deepseek-ai/dsh-client-ui-primitives");var on="dsh-nano-explorer-extra:prefs.v2",oa="dsh-nano-explorer-extra:prefs.v1",Re={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function sn(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function rn(e){let n=sn(e)?e:{},t={};for(let[r,c]of Object.entries(Re))t[r]=typeof n[r]=="boolean"?n[r]:c;return t}function ln(){try{let e=window.localStorage?.getItem(on);if(e!=null)return rn(JSON.parse(e));let n=window.localStorage?.getItem(oa);if(n==null)return{...Re};let t=JSON.parse(n),r=sn(t)?{...t}:{};return delete r.openPreviewOnClick,delete r.openPreviewOnDoubleClick,rn(r)}catch{return{...Re}}}function dn(e){try{window.localStorage?.setItem(on,JSON.stringify(e))}catch{}}function we({label:e,hint:n,checked:t,onChange:r,warn:c}){return W.default.createElement("div",{className:"nxe-settings-row"},W.default.createElement("div",null,W.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:W.default.createElement("div",{className:"nxe-settings-hint"},n),c===!0?W.default.createElement("p",{className:"nxe-warn"},n):null),W.default.createElement(cn.Switch,{checked:t,label:e,onChange:r}))}function un({copy:e,open:n,prefs:t,setPref:r,onClose:c}){if(!n)return null;let u=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return W.default.createElement(xe,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:c,onConfirm:c},W.default.createElement(we,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:h=>r("openPreviewOnClick",h)}),W.default.createElement(we,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:h=>r("openPreviewOnDoubleClick",h)}),u?W.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,W.default.createElement(we,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:h=>r("showOpenButton",h)}),W.default.createElement(we,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:h=>r("showIgnoredBadge",h)}),W.default.createElement(we,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:h=>r("showGitStatus",h)}),W.default.createElement(we,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:h=>r("showSystemFiles",h)}),W.default.createElement(we,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:h=>r("showStatusBar",h)}),W.default.createElement(we,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:h=>r("statsExcludeGit",h)}))}var ie=V(H("react"),1),Be=H("@deepseek-ai/dsh-client-ui-primitives");function hn(e){return function({entry:t}){let r=e.copy(),c=e.statusOf(t.path),u=e.ignoredOf(t.path),h=e.linkOf(t.path),g=e.linkBrokenOf(t.path)===!0,w=t.meta?.kind!=="directory",p=w?void 0:e.folderStatusOf(t.path),s=e.showGit()&&!u,o=s?e.stagedOf(t.path):void 0,E=s?e.unstagedOf(t.path):void 0,b=s?e.remoteOf(t.path):void 0;return ie.default.createElement("span",{className:"nxe-acc",...u?{"data-nxe-ignored":"true"}:{}},h===void 0?null:ie.default.createElement("span",{className:"nxe-acc-link",title:g?r.linkBroken:h?r.symlinkOutsideBadge:r.symlinkBadge,"aria-label":g?r.linkBroken:h?r.symlinkOutsideBadge:r.symlinkBadge,"data-nxe-symlink":g?"broken":h?"outside":"inside"},ie.default.createElement(Be.IconLinkOutlineRegular,{width:14,height:14,"aria-hidden":"true"})),b===void 0?null:ie.default.createElement("span",{className:"nxe-acc-remote","data-status":b.status,"data-direction":b.direction,title:b.direction==="pulled"?r.remotePulled(b.status):r.remotePushed(b.status),"aria-label":b.direction==="pulled"?r.remotePulled(b.status):r.remotePushed(b.status)},`${b.direction==="pulled"?"\u2193":"\u2191"}${b.status}`),s&&c!==void 0?ie.default.createElement("span",{className:"nxe-acc-letter","data-status":c,"data-staged":o===void 0?"false":"true",title:e.statusLabel(c,o,E),"aria-label":e.statusLabel(c,o,E)},c):null,s&&p!==void 0?ie.default.createElement("span",{className:"nxe-acc-dot","data-status":p,title:e.statusLabel(p),"aria-label":e.statusLabel(p)}):null,u?ie.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:r.ignoredBadge,"aria-label":r.ignoredBadge},ie.default.createElement(Be.IconCloseCircleOutlineRegular,{width:14,height:14,"aria-hidden":"true"})):null,w&&e.showOpenButton()?ie.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:r.openFile,"aria-label":`${r.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:N=>{N.stopPropagation(),e.open(t)}},ie.default.createElement(Be.IconRightUpOutlineRegular,{width:12,height:12,"aria-hidden":"true"})):null)}}var D=V(H("react"),1);var Y=H("@deepseek-ai/dsh-client-ui-primitives");function kt({icon:e,value:n,title:t,scope:r}){return D.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":r},e,D.default.createElement("span",{className:"nxe-figure-value"},n))}function pn(e){let{copy:n,git:t,stats:r,statsState:c,prefs:u,onOpenBranch:h,onOpenCommit:g}=e;if(!u.showStatusBar)return null;let w=[];if(t==null)w.push(D.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},D.default.createElement(Y.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),D.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let s=t.detached?n.detached:t.branch??n.detached,o=t.files?.length??0,E=t.conflicts?.length??0,b=o>0;w.push(D.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(b),"data-conflicted":String(E>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(s,b,E),"aria-label":n.branchButtonTooltip(s,b,E),onClick:h},D.default.createElement(Y.IconBranchOutlineRegular,{width:14,height:14}),D.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},s),b?D.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,E>0?D.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&w.push(D.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},D.default.createElement(Y.IconArchiveOutlineRegular,{width:14,height:14}),D.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let N=t.upstream===null||t.upstream===void 0?void 0:Yt(t.ahead??0,t.behind??0);w.push(D.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(o),title:n.commitButtonTooltip(o,N===void 0?null:N),"aria-label":n.commitButtonTooltip(o,N===void 0?null:N),onClick:g},D.default.createElement(Y.IconRefreshOutlineRegular,{width:14,height:14}),N===void 0?null:D.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},N),D.default.createElement("span",{className:"nxe-chip-badge","data-nxe-pending":String(o),"data-empty":String(o===0)},String(o))))}let p=[];if(c==="loading")p.push(D.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(c==="failed")p.push(D.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(r!=null){let s=r.truncated?"+":"",o=u.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";p.push(D.default.createElement(kt,{key:"dirs",scope:"directories",icon:D.default.createElement(Y.IconFolderCloseRegular,{width:14,height:14}),value:`${r.directories}${s}`,title:n.statsTooltip(r.files,r.directories,Ae(r.bytes))+o})),p.push(D.default.createElement(kt,{key:"files",scope:"files",icon:D.default.createElement(Y.IconDeliverDocRegular,{width:14,height:14}),value:`${r.files}${s}`,title:n.statsTooltip(r.files,r.directories,Ae(r.bytes))+o})),p.push(D.default.createElement(kt,{key:"bytes",scope:"bytes",icon:D.default.createElement(Y.IconGaugeOutlineRegular,{width:14,height:14}),value:Ae(r.bytes),title:n.statsSizeTooltip(Ae(r.bytes))+o}))}return p.push(D.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},D.default.createElement(Y.IconSettingsOutlineRegular,{width:14,height:14}))),D.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},D.default.createElement("div",{className:"nxe-status-left"},w),D.default.createElement("div",{className:"nxe-status-right"},p))}var mn=V(H("react"),1);function fn({menu:e,actions:n,onClose:t}){return mn.default.createElement(ft,{menu:e,actions:n,onClose:t})}var A=V(H("@deepseek-ai/dsh-client-ui-primitives"),1);var wn=V(H("react"),1);function le(e,n){let t=ue(e),r=String(n??"").replace(/\\/gu,"/");return r===""?t:r.startsWith("/")||/^[A-Za-z]:\//u.test(r)?ue(r):`${t==="/"?"":t}/${r}`.replace(/\/{2,}/gu,"/")}function Q(e,n){return ue(le(e,n))}function sa(e,n){let t=ue(e),r=ue(n);return t===r?!0:r.startsWith(t==="/"?"/":`${t}/`)}function re(e,n){let t=ue(e),r=ue(n);return r===t?"":sa(t,r)?r.slice(t==="/"?1:t.length+1):r}function Le(e){let n=ue(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Ue(e){let n=ue(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function ue(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:Ne,useEffect:gn,useMemo:xn,useRef:He,useState:Ge}=wn.default;function bn(e){let{sessionId:n,root:t,request:r,prefs:c,onListed:u}=e,[h,g]=Ge(()=>new Map),[w,p]=Ge(()=>new Set),s=He(w);s.current=w;let[o,E]=Ge(null),[b,N]=Ge(null),[y,v]=Ge(0),C=He(!0),U=He(u);U.current=u,gn(()=>()=>{C.current=!1},[]);let F=Ne(async(T,I=!1)=>{let O=Q(t,T);I||g(P=>{let B=new Map(P);return B.get(O)===void 0&&B.set(O,{loading:!0,entries:[]}),B});let $=await r("/list",{sessionId:n,path:T});if(C.current)return g(P=>{let B=new Map(P),ce=B.get(O);return $.ok?B.set(O,{entries:$.entries,truncated:$.truncated===!0,outside:$.outside===!0,failed:ce?.failed===!0&&ce.entries?.length>0?ce.failed:!1}):B.set(O,{entries:ce?.entries??[],failed:!0,message:$.message,code:$.code}),B}),U.current?.(T,$.ok?$.entries.map(P=>P.name):[]),$},[t,n,r]),S=He(void 0),Z=He([]);gn(()=>{if(t!==void 0){if(S.current!==t){S.current=t,g(new Map),p(new Set),F(t);return}F(t,!0);for(let T of Z.current)F(T,!0)}},[t,y,F]);let M=Ne(async()=>{Z.current=[...s.current],v(T=>T+1)},[]),de=Ne(T=>F(T,!0),[F]),f=Ne((T,I)=>{let O=Q(t,T);p($=>{let P=new Set($);return I?P.add(O):P.delete(O),P}),I&&h.get(O)===void 0&&F(T)},[t,h,F]),ee=Ne(T=>{let I=Q(t,T);g(O=>{if(O.has(I))return O;let $=new Map(O);return $.set(I,{entries:[]}),$})},[t]),_=Ne(T=>{let I=Q(t,T);g(O=>{if(!O.has(I))return O;let $=new Map(O);return $.delete(I),$})},[t]),ve=Ne(T=>{let I=Q(t,T);p(O=>{let $=new Set;for(let P of O)P!==I&&!P.startsWith(`${I}/`)&&$.add(P);return $}),g(O=>{let $=new Map;for(let[P,B]of O)P!==I&&!P.startsWith(`${I}/`)&&$.set(P,B);return $})},[t]),J=xn(()=>{let T=[];for(let[I,O]of h)for(let $ of O.entries??[]){let P=I===""?$.name:`${I}/${$.name}`;T.push({...$,path:P})}return T},[h]),Ze=xn(()=>{let T={};for(let[I,O]of h)O.loading===!0&&(O.entries?.length??0)===0?T[I]={loading:!0}:O.failed===!0?T[I]={failure:O.message}:O.truncated===!0&&(T[I]={truncated:!0});return T},[h]);return{levels:h,entries:J,directories:Ze,expanded:[...w],selected:o,setSelected:E,toggle:f,pending:b,setPending:N,refresh:M,refreshLevel:de,loadLevel:F,forget:_,collapseUnder:ve,knownEmpty:ee}}var la=".md";function vn(e,n){let t=e==="file"?"untitled":"new-folder",r=new Set((n??[]).map(u=>String(u.name??"").toLowerCase())),c=u=>e==="file"?`${t}${u===1?"":`-${u}`}${la}`:`${t}${u===1?"":`-${u}`}`;for(let u=1;u<1e4;u+=1){let h=c(u);if(!r.has(h.toLowerCase()))return h}throw new Error("cannot find an unused name")}function yn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:R,useEffect:Ie,useMemo:be,useRef:oe,useState:G,useSyncExternalStore:da}=x.default,ca=400,ua=["U","D","M","A","R","?"],ha=new Set([".git",".DS_Store"]);function kn(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function En(e){let{useTabInfo:n,sessionId:t,useSessions:r,renderSlot:c,renderFactorySlot:u,useContextMenu:h,nxe:g}=e,{tab:w,panel:p}=n(),s=r(a=>a.byId[t]?.cwd),o=g.copy,E=da(g.subscribePrefs,g.getPrefs,g.getPrefs),[b,N]=G(null),[y,v]=G(void 0),[C,U]=G(null),[F,S]=G("idle"),[Z,M]=G(null),[de,f]=G(!1),[ee,_]=G(void 0),[ve,J]=G(void 0),[Ze,T]=G(void 0),[I,O]=G([]);Ie(()=>{let a=!0;return(async()=>{try{let i=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!i.ok)return;let l=await i.json(),k=Array.isArray(l.apps)?l.apps:[];a&&O(k.filter(L=>typeof L=="string"))}catch{}})(),()=>{a=!1}},[]);let[$,P]=G(null),[B,ce]=G(null),[je,We]=G(null),[Nt,Ce]=G(null),[Tn,et]=G(!1),[Ct,Te]=G(!1),[Tt,se]=G(void 0),[$n,tt]=G(!1),ye=oe(0),[nt,qe]=G(()=>new Map);Ie(()=>{Ce(null),se(void 0),tt(!1),et(!1),M(null),_(void 0),P(null),We(null),ce(null),qe(new Map),v(void 0)},[t,s,w.visible]);let $t=oe({path:"",at:0}),$e=oe(E);$e.current=E;let z=R(async(a,i)=>{try{let l=await fetch(`/nano-explorer-extra${a}`,{method:i===void 0?"GET":"POST",headers:i===void 0?void 0:{"content-type":"application/json"},body:i===void 0?void 0:JSON.stringify(i),credentials:"same-origin",cache:"no-store"}),k=await l.json().catch(()=>({error:`HTTP ${l.status}`}));return l.ok?{ok:!0,...k}:{ok:!1,message:k?.error??`HTTP ${l.status}`}}catch(l){return{ok:!1,message:l instanceof Error?l.message:String(l)}}},[]),On=R(async(a,i)=>{if(!$e.current.showGitStatus||!Array.isArray(i)||i.length===0)return;let l=await z("/ignored",{sessionId:t,paths:i});!l.ok||!Array.isArray(l.ignored)||l.ignored.length===0||Rn(k=>{let L=new Set(k),j=re(s??"",a);for(let ae of l.ignored)L.add(j===""?ae:`${j}/${ae}`);return L})},[z,t,s]),m=bn({sessionId:t,root:s,request:z,prefs:E,onListed:(a,i)=>{On(a,i)}}),Me=oe(0),Ot=oe(null);Ot.current=m;let Dt=oe(async()=>{}),q=R(async()=>{if(s===void 0)return;if(!$e.current.showGitStatus){N(null),v(void 0),qe(new Map);return}let a=Me.current+1;Me.current=a;let i=await z(`/status?sessionId=${encodeURIComponent(t)}`);if(a===Me.current){if(!i.ok){v(i.message);return}N(i.git??null),v(i.gitError),qe(new Map);for(let l of Ot.current?.expanded??[])Dt.current(l)}},[s,t,z]),te=R(async()=>{if(s===void 0)return;S("loading");let a=await z(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!a.ok){S("failed");return}U(a.stats??null),S("ok")},[s,t,z]),Rt=R(a=>{Ce(a),se(void 0),tt(!0),q().finally(()=>tt(!1))},[q]);Ie(()=>{q()},[q]),Ie(()=>{te()},[s]);let at=oe(0),he=R(()=>{window.clearTimeout(at.current),at.current=window.setTimeout(()=>{te()},2e3)},[te]);Ie(()=>()=>{window.clearTimeout(at.current),window.clearTimeout(ye.current)},[]);let Dn=be(()=>{let a=new Map;for(let i of m.entries)i.symlink===!0&&a.set(i.path,{outside:i.outside===!0});return a},[m.entries]),rt=be(()=>Array.isArray(b?.files)?b.files:[],[b]),it=be(()=>{let a=new Map;for(let i of rt)a.set(i.path,i);return a},[rt]),[ot,Rn]=G(()=>new Set),Oe=b?.root,Bt=oe(Oe);Bt.current=Oe;let pe=be(()=>{if(nt.size===0)return it;let a=new Map(it);for(let[i,l]of nt)a.set(i,l);return a},[it,nt]),ne=R(a=>{if(Oe==null)return;let i=le(s??"",a);return re(Oe,i)},[Oe,s]),st=R(a=>{let i=ne(a);if(i===void 0)return!1;if(ot.has(i))return!0;let l=i.split("/");for(let k=l.length-1;k>0;k-=1)if(ot.has(l.slice(0,k).join("/")))return!0;return!1},[ot,ne]),It=R(a=>{let i=ne(a);if(i!==void 0)return pe.get(i)?.status},[pe,ne]),Bn=R(a=>{let i=ne(a);if(i!==void 0)return pe.get(i)?.staged},[pe,ne]),In=R(a=>{let i=ne(a);if(i!==void 0)return pe.get(i)?.unstaged},[pe,ne]),zt=be(()=>{let a=new Map;for(let i of b?.remote?.pushed??[])a.set(i.path,{status:i.status,direction:"pushed"});for(let i of b?.remote?.pulled??[])a.set(i.path,{status:i.status,direction:"pulled"});return a},[b]),zn=R(a=>{let i=ne(a);if(i!==void 0)return zt.get(i)},[zt,ne]),ke=R(a=>{let i=le(s??"",a.path),l=s??"",k=re(l,i),j=l!==""&&k!==i?`dsh-resource://file/session/${encodeURIComponent(t)}/${kn(k)}`:`dsh-resource://file/absolute/${kn(i.replace(/^\/+/,""))}`;p.isFloating?w.actions.openResource(j):w.actions.openResource(j,{paneId:p.id})},[s,t,w.actions,p.id,p.isFloating]),lt=R(async a=>{if(s===void 0||!$e.current.showGitStatus)return;let i=Me.current,l=await z(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(a)}`);if(i!==Me.current||!l.ok||l.git===null||l.git===void 0)return;let k=l.git.root,L=Bt.current??s,j=re(L,a);if(j===a&&j!=="")return;let ae=[];for(let ge of l.git.files??[]){let At=k===void 0?ge.path:`${k.replace(/\/+$/u,"")}/${ge.path}`,Lt=re(L,At);Lt!==At&&ae.push({...ge,path:Lt})}qe(ge=>Xt(ge,j,ae))},[s,t,z]);Dt.current=lt;let dt=R(async a=>{let i=await m.loadLevel(a.path);m.toggle(a.path,!0),i?.ok&&lt(a.path)},[m,lt]),Fn=R(async a=>{f(!0);let i=await z("/delete",{sessionId:t,path:a.path,kind:a.kind==="directory"?"directory":"file"});if(f(!1),!i.ok){J(i.message);return}We(null),J(void 0),m.forget(a.path),m.collapseUnder(a.path);let l=Le(a.path);l!==a.path&&await m.refreshLevel(l),m.selected===a.path&&m.setSelected(null),he()},[t,z,m,he]),Ft=R(a=>{if(s===void 0)return;let i=pa(m,s),l=ma(m,s,i);J(void 0),P({kind:a,directory:i,proposed:vn(a,l)})},[s,m]),Mn=R(async a=>{if($===null)return;let{kind:i,directory:l}=$,k=yn(a,o);if(!k.ok){J(k.message);return}f(!0);let L=await z(i==="file"?"/create-file":"/create-folder",{sessionId:t,directory:l,name:k.name});if(f(!1),!L.ok){J(L.message);return}P(null),J(void 0),await m.refreshLevel(l);let j=re(s??"",l),ae=le(s??"",`${j===""?"":`${j}/`}${k.name}`);m.setSelected(ae),i==="folder"&&(m.knownEmpty(ae),m.toggle(ae,!0)),he()},[$,o,s,t,z,m,he]),Pn=R(async(a,i)=>{if(s===void 0)return;let l=le(s,a.path),k=a.meta?.kind==="directory"?"directory":"file";f(!0),_(void 0);let L=await z("/rename",{sessionId:t,path:l,name:i,kind:k});if(f(!1),!L.ok){_(L.message);return}M(null);let j=Le(l);await m.refreshLevel(j),k==="directory"&&m.collapseUnder(l),m.setSelected(le(s,`${re(s,j)===""?"":`${re(s,j)}/`}${i.trim()}`)),he()},[s,t,z,m,he]),ct=R(async(a,i)=>{if(s===void 0)return;let l=le(s,a.path),k=await z("/move",{sessionId:t,path:l,directory:i});if(!k.ok){T(k.message),window.clearTimeout(ye.current),ye.current=window.setTimeout(()=>T(void 0),4e3);return}let L=Le(l);await m.refreshLevel(L),await m.refreshLevel(i),a.meta?.kind==="directory"&&m.collapseUnder(l),m.selected===l&&m.setSelected(k.path),he(),q()},[s,t,z,m,he,q]),An=R(async a=>{f(!0),_(void 0);let i=await z("/commit",{sessionId:t,message:a});if(f(!1),!i.ok){_(i.message);return}M(null),await m.refresh(),await q(),await te()},[t,z,m,q,te]),Mt=R(async()=>{Te(!0),se(void 0);let a=await z("/pull",{sessionId:t});if(Te(!1),!a.ok){se(a.message);return}await m.refresh(),await q(),await te()},[t,z,m,q,te]),Ln=R(async a=>{Te(!0),se(void 0);let i=await z("/checkout",{sessionId:t,branch:a});if(Te(!1),!i.ok){se(i.message);return}T(o.branchSwitched(a)),window.clearTimeout(ye.current),ye.current=window.setTimeout(()=>T(void 0),2e3),await m.refresh(),await q(),await te()},[t,z,m,q,te,o]),Un=R(async a=>{Te(!0),se(void 0);let i=await z("/commit",{sessionId:t,message:a});return Te(!1),i.ok?(await m.refresh(),await q(),await te(),!0):(se(i.message),!1)},[t,z,m,q,te]),ut=R(async(a,i)=>{try{await navigator.clipboard.writeText(i||a),T(o.copied),window.clearTimeout(ye.current),ye.current=window.setTimeout(()=>T(void 0),1600)}catch(l){J(l instanceof Error?l.message:String(l))}},[o.copied]),ht=oe(0),me=oe(null),pt=oe("file"),fe=R(()=>{window.clearTimeout(ht.current),ht.current=0,me.current!==null&&me.current.removeAttribute("data-nxe-drop"),me.current=null},[]),Ke=R((a,i)=>{fe(),me.current=i,i.setAttribute("data-nxe-drop","true"),a!==null&&!m.expanded.includes(a.path)&&(ht.current=window.setTimeout(()=>{dt(a)},650))},[fe,dt,m.expanded]),mt=R(a=>(a.preventDefault(),a.stopPropagation(),fe(),a.dataTransfer?.getData("application/x-nxe-move")??""),[fe]),Hn=R((a,i)=>({draggable:!0,onDragStart:l=>{pt.current=i,l.dataTransfer?.setData("application/x-nxe-move",a.path),l.dataTransfer&&(l.dataTransfer.effectAllowed="move")},onDragEnd:fe,onContextMenu:l=>{l.preventDefault(),l.stopPropagation(),m.setSelected(a.path),ce({x:l.clientX,y:l.clientY,path:a.path,name:a.name,kind:i,openedAt:Date.now()})},onDragOver:i==="directory"?l=>{l.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(l.preventDefault(),l.stopPropagation(),l.dataTransfer.dropEffect="move",me.current!==l.currentTarget&&Ke(a,l.currentTarget))}:void 0,onDragEnter:i==="directory"?l=>{l.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(l.currentTarget.contains(l.relatedTarget)||Ke(a,l.currentTarget))}:void 0,onDragLeave:i==="directory"?l=>{l.relatedTarget instanceof Node&&l.currentTarget.contains(l.relatedTarget)||me.current===l.currentTarget&&fe()}:void 0,onDrop:i==="directory"?l=>{let k=mt(l);k!==""&&ct({path:k,meta:{kind:pt.current}},a.path)}:void 0}),[m,fe,Ke,mt,ct]),Gn=R(a=>{let i=ne(a);if(i===void 0)return;let l=i===""?"":`${i}/`,k,L=-1;for(let[j,ae]of pe){if(l!==""&&!j.startsWith(l))continue;let ge=ua.indexOf(ae.status);ge>L&&(L=ge,k=ae.status)}return k},[pe,ne]),Pt=be(()=>hn({copy:()=>o,statusOf:It,stagedOf:Bn,unstagedOf:In,remoteOf:zn,ignoredOf:st,folderStatusOf:Gn,linkBrokenOf:a=>m.levels.get(Q(s??"",a))?.code==="broken-link",linkOf:a=>{let i=Dn.get(a);if(i!==void 0)return i.outside===!0},showGit:()=>E.showGitStatus,showIgnoredBadge:()=>E.showIgnoredBadge,showOpenButton:()=>E.showOpenButton,statusLabel:a=>g.statusLabel(o,a),open:a=>ke(a)}),[o,It,st,m.levels,s,E.showGitStatus,E.showIgnoredBadge,E.showOpenButton,g,ke]),jn=be(()=>({slots:{accessory:Pt},fallback:null}),[Pt]);if(s===void 0)return x.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},o.noWorkspace);let Wn=m.entries.filter(a=>E.showSystemFiles||!ha.has(a.name)).map(a=>({path:a.path,name:a.name,meta:{kind:a.type==="directory"?"directory":a.type==="file"?"file":"other",...a.symlink===!0?{link:!0}:{},...a.outside===!0?{outside:!0}:{},...st(a.path)?{hidden:!0}:{}}})),qn=u("sidebar.files.tree",{root:Q(s,s),entries:Wn,expanded:m.expanded,directories:m.directories,current:m.selected===null?void 0:Q(s,m.selected),onToggle:a=>{if(m.expanded.includes(a.path)){m.toggle(a.path,!1);return}dt(a)},onOpen:a=>{m.setSelected(a.path);let i=Date.now(),l=$t.current,k=l.path===a.path&&i-l.at<=ca;$t.current={path:a.path,at:i},(k?$e.current.openPreviewOnDoubleClick:$e.current.openPreviewOnClick)&&ke(a)},rowTriggerProps:Hn,canOpen:()=>!0},jn);Ie(()=>{let a=i=>{_(void 0),M({kind:"rename",entry:{path:i.path,name:Ue(i.path),meta:{kind:i.kind}}})};return g.setRenameHandler(a),()=>g.setRenameHandler(void 0)},[g]);let Kn=R(a=>{if(m.pending!==null)return;if(a.key==="F2"&&m.selected!==null){a.preventDefault(),_(void 0),M({kind:"rename",entry:{path:m.selected,name:Ue(m.selected),meta:{kind:m.levels.has(m.selected)?"directory":"file"}}});return}let i=m.selected;if(i===null)return;let l=Q(s??"",i),k=m.levels.has(l)||m.expanded.includes(l);if(a.key===" "){if(!k)return;a.preventDefault(),m.toggle(i,!m.expanded.includes(l));return}if(a.key==="Enter"){if(a.preventDefault(),k){m.toggle(i,!m.expanded.includes(l));return}ke({path:l,name:Ue(i),meta:{kind:"file"}})}},[m,s,ke]),_n=Z===null?null:Z.kind==="commit"?x.default.createElement(_t,{copy:o,files:rt,busy:de,error:ee,onConfirm:An,onCancel:()=>{M(null),_(void 0)}}):x.default.createElement(bt,{copy:o,currentName:Z.entry.name,busy:de,error:ee,onConfirm:a=>Pn(Z.entry,a),onCancel:()=>{M(null),_(void 0)}}),Yn=be(()=>{if(B===null)return[];let a={path:B.path,name:B.name,kind:B.kind},i=I[0],l=k=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:k,path:B.path}),credentials:"same-origin"})};return[i===void 0?null:{id:"reveal",label:o.revealIn(Xe[i]??i),icon:x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(i)}`,alt:"",width:14,height:14}),run:()=>{l(i)}},{id:"copy-path",label:o.copyAbsolute,icon:x.default.createElement(A.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{ut(B.path,B.path)}},{id:"copy-relative",label:o.copyRelative,icon:x.default.createElement(A.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{ut(B.path,re(s??"",B.path))}},B.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:o.openInNotepad,icon:x.default.createElement(A.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let k=await z("/read",{sessionId:t,path:B.path});if(!k.ok){J(k.message??o.openInNotepadFail);return}J(void 0);let L=B.path.startsWith("/")?B.path:`${s??""}/${B.path}`;await window.__nanoNotepad.import(B.name,k.content,{sourcePath:L})}},{id:"rename",label:o.rename,icon:x.default.createElement(A.IconEditOutlineRegular,{width:14,height:14}),run:()=>{_(void 0),M({kind:"rename",entry:{...a,meta:{kind:B.kind}}})}},{id:"delete",label:o.delete,tone:"danger",icon:x.default.createElement(A.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{J(void 0),We(a)}}].filter(Boolean)},[B,o,I,s,ut]);return x.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":g.scheme()},x.default.createElement("div",{className:"nxe-header"},x.default.createElement("span",{className:"nxe-path",title:s,"data-nxe-path":"true"},s),x.default.createElement(Ve,{label:o.newFile,onClick:()=>{Ft("file")}},ba()),x.default.createElement(Ve,{label:o.newFolder,onClick:()=>{Ft("folder")}},va()),x.default.createElement(Ve,{label:o.rename,disabled:m.selected===null,onClick:()=>{let a=m.selected;a!==null&&(_(void 0),M({kind:"rename",entry:{path:a,name:Ue(a),meta:{kind:m.levels.has(a)?"directory":"file"}}}))}},ka()),x.default.createElement(Ea,{copy:o,cwd:s??"",apps:I}),x.default.createElement(Ve,{label:o.reload,onClick:()=>{m.refresh(),q()}},ya())),ve===void 0?null:x.default.createElement("p",{className:"nxe-row-note",role:"status"},ve),je===null?null:x.default.createElement(De,{copy:o,title:o.deleteTitle,busy:de,confirmLabel:o.delete,onConfirm:()=>{Fn(je)},onCancel:()=>{We(null),J(void 0)},description:x.default.createElement(x.default.Fragment,null,o.deleteBody(je.name),je.kind==="directory"?x.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${o.deleteFolderNote}`):null)}),$===null?null:x.default.createElement(bt,{copy:o,mode:"create",busy:de,currentName:$.proposed,onConfirm:a=>{Mn(a)},onCancel:()=>{P(null),J(void 0)}}),x.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:Kn,onDragOver:a=>{a.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(a.preventDefault(),a.dataTransfer.dropEffect="move",me.current!==a.currentTarget&&Ke(null,a.currentTarget))},onDragLeave:a=>{a.relatedTarget instanceof Node&&a.currentTarget.contains(a.relatedTarget)||me.current===a.currentTarget&&fe()},onDrop:a=>{let i=mt(a);i!==""&&ct({path:i,meta:{kind:pt.current}},s)}},qn),x.default.createElement(gt,{text:Ze}),y===void 0?null:x.default.createElement("div",{className:"nano-toast nxe-git-alert",role:"alert","data-nxe-git-alert":"true"},x.default.createElement(A.IconWarningOutlineRegular,{width:14,height:14,className:"nxe-git-alert-icon","aria-hidden":"true"}),x.default.createElement("span",{className:"nxe-git-alert-text"},y),x.default.createElement("button",{type:"button",className:"nxe-git-alert-x",title:o.dismiss,"aria-label":o.dismiss,onClick:()=>v(void 0)},x.default.createElement(A.IconCloseOutlineRegular,{width:12,height:12,"aria-hidden":"true"}))),x.default.createElement(pn,{copy:o,git:b,stats:C,statsState:F,prefs:E,onOpenBranch:()=>Rt("branch"),onOpenCommit:()=>Rt("commit"),onRetryStats:()=>{te()},onOpenSettings:()=>et(!0)}),_n,x.default.createElement(un,{copy:o,open:Tn,prefs:E,onClose:()=>et(!1),setPref:(a,i)=>g.setPref(a,i)}),x.default.createElement(nn,{copy:o,open:Nt==="branch",git:b,busy:Ct,error:Tt,onClose:()=>{Ce(null),se(void 0)},onPull:Mt,onCheckout:Ln,onRefresh:async()=>{await q()},onOpenConflict:a=>{ke({path:le(s??"",a)}),Ce(null)}}),x.default.createElement(an,{copy:o,open:Nt==="commit",git:b,busy:Ct,error:Tt,refreshing:$n,onClose:()=>{Ce(null),se(void 0)},onCommit:Un,onPull:Mt,onOpenConflict:a=>{ke({path:le(s??"",a)}),Ce(null)}}),x.default.createElement(fn,{menu:B,copy:o,actions:Yn,onClose:()=>ce(null)}))}function Ve({label:e,onClick:n,children:t,disabled:r}){return x.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:r===!0},t)}function pa(e,n){let t=e.selected;if(t===null)return n;let r=Q(n,t);return e.levels.has(r)?r:Le(r)}function ma(e,n,t){return e.levels.get(Q(n,t))?.entries??[]}var fa=A.IconPlusOutlineRegular,ga=A.IconFolderCloseRegular,xa=A.IconEditOutlineRegular,wa=A.IconRefreshOutlineRegular;function ba(){return x.default.createElement(fa,{width:16,height:16})}function va(){return x.default.createElement(ga,{width:16,height:16})}function ya(){return x.default.createElement(wa,{width:16,height:16})}function ka(){return x.default.createElement(xa,{width:16,height:16})}function Ea({copy:e,cwd:n,apps:t}){let r=Array.isArray(t)?t:[];if(n===""||r.length===0)return null;let[c,u]=x.default.useState(r[0]),[h,g]=x.default.useState(!1),w=x.default.useRef(null),p=r.includes(c)?c:r[0];x.default.useEffect(()=>{if(!h)return;let o=b=>{w.current!==null&&!w.current.contains(b.target)&&g(!1)},E=b=>{b.key==="Escape"&&g(!1)};return document.addEventListener("pointerdown",o,!0),document.addEventListener("keydown",E,!0),()=>{document.removeEventListener("pointerdown",o,!0),document.removeEventListener("keydown",E,!0)}},[h]);let s=o=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:o,path:n}),credentials:"same-origin"})};return x.default.createElement("span",{className:"nxe-reveal",ref:w,"data-nxe-reveal":p},x.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(Xe[p]??p),"aria-label":e.revealIn(Xe[p]??p),onClick:()=>{s(p)}},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(p)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),x.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(h),onClick:()=>g(o=>!o)},x.default.createElement(A.IconChevronDownOutlineRegular,{width:10,height:10,"aria-hidden":"true"})),h?x.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},r.map(o=>x.default.createElement("button",{key:o,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{u(o),g(!1),s(o)}},x.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nano-menu-label"},Xe[o]??o)))):null)}var Xe={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var Sa={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0 Git \u72B6\u6001",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",dismiss:"\u5173\u95ED",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`\u4ED3\u5E93 \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitRefreshing:"\u6B63\u5728\u8BFB\u53D6\u6700\u65B0\u72B6\u6001",commitDrawerBody:(e,n)=>n?`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${n} \xB7 ${e} \u5904\u6539\u52A8`:`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${e} \u5904\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchConflictBlocks:"\u8FD9\u4E9B\u6587\u4EF6\u8FD8\u5728\u51B2\u7A81\u4E2D\u3002\u89E3\u51B3\u4E4B\u524D\uFF0C\u8FD9\u5F20\u5361\u7247\u91CC\u7684\u5207\u6362\u5206\u652F\u4E0D\u4F1A\u6267\u884C\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,checkoutTitle:e=>`\u5207\u6362\u5230 ${e}\uFF1F`,checkoutBody:e=>`\u5F53\u524D\u5DE5\u4F5C\u6811\u4F1A\u6539\u5230\u5206\u652F ${e}\u3002\u672A\u63D0\u4EA4\u7684\u66F4\u6539\u5982\u679C\u4F1A\u88AB\u8986\u76D6\uFF0C\u5207\u6362\u4F1A\u88AB\u62D2\u7EDD\u3002`,checkoutConfirm:"\u5207\u6362",worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u63D0\u4EA4\u56FE",localStaged:"\u5DF2\u6682\u5B58",localUnstaged:"\u672A\u6682\u5B58",localUntracked:"\u672A\u8DDF\u8E2A",localConflicts:"\u51B2\u7A81",filterChanges:"\u6309\u66F4\u6539\u7C7B\u578B\u7B5B\u9009",filterAll:"\u5168\u90E8",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Refresh Git status",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",dismiss:"Dismiss",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`Repository \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitRefreshing:"Reading latest status",commitDrawerBody:(e,n)=>n?`Working tree \xB7 ${n} \xB7 ${e} changes`:`Working tree \xB7 ${e} changes`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchConflictBlocks:"These files are still in conflict. Branch switches in this card do nothing until they are resolved.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,checkoutTitle:e=>`Switch to ${e}?`,checkoutBody:e=>`This worktree will move to ${e}. If local changes would be overwritten, the switch is refused.`,checkoutConfirm:"Switch",worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"History",localStaged:"Staged",localUnstaged:"Unstaged",localUntracked:"Untracked",localConflicts:"Conflicts",filterChanges:"Filter by change type",filterAll:"All",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function Na(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function ze(e){return Sa[Na(e)]}function Sn(e,n,t,r){let c={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&r!==void 0?e.statusBoth(c):t!==void 0?e.statusStaged(c):r!==void 0?e.statusUnstaged(c):c}var Nn=`${xt}

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
`;var Fe=V(H("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:Qe,useCallback:Br,useEffect:Ir,useState:zr}=St.default,Ca=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var Ta="files",Et="nano-explorer-extra",Cn={handler:void 0};function $a(){let e=ln(),n=new Set;return{get:()=>e,set:t=>{e=t,dn(e);for(let r of n)r()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function Oa(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=Nn,document.head.append(n),e.effect(()=>()=>n.remove());let t=$a(),r=p=>e.sessions.list.getSnapshot().byId[p]?.cwd,c=p=>{Cn.handler?.(p)},u=()=>e.locale.getSnapshot().active,h=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",g=()=>({copy:ze(u()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:p=>t.subscribe(p),scheme:h,statusLabel:Sn,onListed:()=>{},setRenameHandler:p=>{Cn.handler=p},setPref:(p,s)=>t.set({...t.get(),[p]:s})});e.effect(()=>e.sidebarRightTabs.register({id:Et,kind:Ta,priority:"extension",keepMounted:!0,title:()=>ze(u()).typeLabel,guide:[{id:"explorer",order:10,title:()=>ze(u()).typeLabel,description:()=>ze(u()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:Et,inject:()=>({nxe:g()})},En)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:Et},function({useTabInfo:s}){let{tab:o}=s();return Qe(St.default.Fragment,null,Qe(Fe.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),o.title)})),"nano-explorer-extra: files tab title");let w=e.get("contextMenus");if(w!=null)for(let p of["file","directory"])e.effect(()=>w.register({id:`nano-explorer-extra.${p}`,target:p,order:900,resolve:async s=>{let o=ze(u()),E=s.sessionId===void 0?void 0:r(s.sessionId),b=E===void 0?s.path:re(E,s.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:o.copyRelative,failureLabel:o.copyFailed,run:()=>Da(b)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:o.rename,failureLabel:o.renameFailed,run:()=>c?.({path:s.path,kind:p==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${p} menu`);e.slots.inject("contextMenu.icon",()=>{let p=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},Ra),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},Ba)];return()=>{for(let s of p)s()}})}async function Da(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function Ra(){return Qe(Fe.IconLinkOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}function Ba(){return Qe(Fe.IconEditOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}return ta(Ia);})();
		return __nxeExport;
	}
});
