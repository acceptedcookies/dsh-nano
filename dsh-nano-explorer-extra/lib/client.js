window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var Un=Object.create;var We=Object.defineProperty;var Gn=Object.getOwnPropertyDescriptor;var Hn=Object.getOwnPropertyNames;var jn=Object.getPrototypeOf,Wn=Object.prototype.hasOwnProperty;var A=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var _n=(e,n)=>{for(var t in n)We(e,t,{get:n[t],enumerable:!0})},It=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let l of Hn(n))!Wn.call(e,l)&&l!==t&&We(e,l,{get:()=>n[l],enumerable:!(r=Gn(n,l))||r.enumerable});return e};var J=(e,n,t)=>(t=e!=null?Un(jn(e)):{},It(n||!e||!e.__esModule?We(t,"default",{value:e,enumerable:!0}):t,e)),qn=e=>It(We({},"__esModule",{value:!0}),e);var Oa={};_n(Oa,{DEFAULT_PREFS:()=>Ce,apply:()=>Na,inject:()=>ka});var wt=J(A("react"),1);var b=J(A("react"),1);var V=J(A("react"),1),ut=A("@deepseek-ai/dsh-client-ui-primitives");var be=J(A("react"),1),ze=A("@deepseek-ai/dsh-client-ui-primitives");function me({copy:e,title:n,description:t,confirmLabel:r,confirmDisabled:l,busy:h,error:f,danger:w,footer:y,maxHeight:p,width:o,region:d,onConfirm:k,onCancel:m,children:S}){return be.default.createElement(ze.Modal,{open:!0,onClose:m,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",p===void 0?"":"nano-dialog-capped",o===void 0?"":"nano-dialog-sized",d===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:y??be.default.createElement(be.default.Fragment,null,be.default.createElement(ze.Button,{variant:"outline",className:"nano-modal-action",onClick:m},e.cancel),be.default.createElement(ze.Button,{variant:w?"outline":"primary",className:w?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:l===!0||h===!0,onClick:k},r??e.confirm))},S,f===void 0?null:be.default.createElement("p",{className:"nano-dialog-error",role:"alert"},f))}var ve=J(A("react"),1),{useCallback:Ba,useEffect:Pt,useRef:Ft,useState:Kn}=ve.default;function lt({menu:e,actions:n,onClose:t,width:r=208,maxHeight:l}){let h=Ft(null),[f,w]=Kn(0),y=e===null?[]:n,p=y.length,o=Ft(y);o.current=y;let d=e===null?null:e.openedAt;if(Pt(()=>{d!==null&&w(0)},[d]),Pt(()=>{if(e===null)return;let g=N=>{h.current!==null&&!h.current.contains(N.target)&&t()},E=N=>{if(N.key==="Escape"){N.stopPropagation(),t();return}if(N.key==="ArrowDown"){N.preventDefault(),w(z=>(z+1)%p);return}if(N.key==="ArrowUp"){N.preventDefault(),w(z=>(z-1+p)%p);return}N.key==="Enter"&&(N.preventDefault(),t(),o.current[f]?.run())};return document.addEventListener("pointerdown",g,!0),document.addEventListener("keydown",E,!0),()=>{document.removeEventListener("pointerdown",g,!0),document.removeEventListener("keydown",E,!0)}},[e,f,p,t]),e===null||p===0)return null;let k=p*28+8,m=Math.min(e.x,(window.innerWidth||r)-r-8),S=Math.min(e.y,(window.innerHeight||k)-k-8);return ve.default.createElement("div",{className:"nano-menu",role:"menu",ref:h,style:{position:"fixed",left:`${Math.max(8,m)}px`,top:`${Math.max(8,S)}px`,minWidth:`${r}px`,...typeof l=="number"?{maxHeight:`${Math.round(l)}px`,overflowY:"auto",overscrollBehavior:"contain"}:{}},"data-nano-menu":"true"},y.map((g,E)=>ve.default.createElement(Mt,{key:g.id,item:g,index:E,active:E===f,onHover:w,onRun:t})))}function Mt({item:e,index:n,active:t,onHover:r,onRun:l}){return ve.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>r(n),onClick:()=>{l(),e.run()}},e.icon===void 0?null:ve.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),ve.default.createElement("span",{className:"nano-menu-label"},e.label))}var Lt=J(A("react"),1);function dt({text:e}){return e==null?null:Lt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var ct=`
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
`;var{useState:At}=V.default;function Te(e){return _e(),V.default.createElement(me,e)}function _e(){V.default.useEffect(()=>{let e=!0,n=(g,E)=>{for(let[N,z]of Object.entries(E))g.style[N]!==z&&(g.style[N]=z)},t=()=>{let g=null,E=0;for(let N of document.querySelectorAll("[data-nxe]")){let z=N.closest("[data-sidebar-right-pane]")??N;if(!(z instanceof HTMLElement))continue;let M=z.getBoundingClientRect(),O=M.width*M.height;O>E&&(g=z,E=O)}return g},r=null,l=null,h=()=>document.querySelector('.nano-dialog-card [class*="nxe-"]')!==null,f=()=>{if(!e||!h())return;let g=t();if(!(g instanceof HTMLElement))return;g!==r&&typeof ResizeObserver=="function"&&(l?.disconnect(),r=g,l=new ResizeObserver(f),l.observe(g));let E=g.getBoundingClientRect();if(!(E.width<1||E.height<1))for(let N of document.querySelectorAll(".nano-dialog-card")){if(N.querySelector('[class*="nxe-"]')===null)continue;let z=N.parentElement;if(z instanceof HTMLElement&&(z.classList.add("nxe-confined-layer"),n(z,{position:"fixed",top:`${E.top}px`,left:`${E.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${E.width}px`,height:`${E.height}px`,padding:"12px"}),N.querySelector(".nxe-scm")!==null)){N.dataset.nxeFill="1";let M=g.getAttribute("data-theme");M&&N.setAttribute("data-theme",M),n(z,{display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",overflow:"hidden"}),n(N,{position:"relative",top:"auto",left:"auto",right:"auto",transform:"none"});let O=N.querySelector("[data-nxe-scm]")?.getAttribute("data-nxe-scm"),le=Math.max(240,E.height-24);if(O==="commit"){let W=`${Math.min(Math.round(window.innerHeight*.5),le)}px`;n(N,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:W,minHeight:W,maxHeight:W,display:"flex",flexDirection:"column",overflow:"hidden"})}else n(N,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:"auto",minHeight:"0",maxHeight:`${Math.min(le,Math.round(E.height*.68))}px`,display:"",flexDirection:"",overflow:""})}}},w=null,y=0,p=!1,o=()=>{w!==null&&(w.disconnect(),w=null),y!==0&&(window.cancelAnimationFrame(y),y=0),l?.disconnect(),l=null,r=null,window.removeEventListener("resize",f),p=!1},d=g=>{for(let E of g)for(let N of E.addedNodes)if(N instanceof Element&&(N.matches(".nano-dialog-card, .nano-dialog-card *")||N.querySelector(".nano-dialog-card")!==null))return!0;return!1},k=()=>{if(y=0,!!e){if(!h()){o();return}f(),y=window.requestAnimationFrame(k)}},m=()=>{p||!e||!h()||(p=!0,w=new MutationObserver(g=>{d(g)&&f()}),w.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("resize",f),f(),y=window.requestAnimationFrame(k))},S=new MutationObserver(g=>{!e||p||!d(g)||m()});return S.observe(document.body,{childList:!0,subtree:!0}),m(),()=>{e=!1,o(),S.disconnect();for(let g of document.querySelectorAll(".nxe-confined-layer")){g.classList.remove("nxe-confined-layer");for(let E of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction","overflow"])g.style.removeProperty(E)}for(let g of document.querySelectorAll("[data-nxe-fill]"))if(g instanceof HTMLElement){delete g.dataset.nxeFill;for(let E of["width","max-width","height","max-height","min-height","min-width","margin","position","top","left","right","transform","display","flex-direction","overflow"])g.style.removeProperty(E)}}},[])}function Ut({children:e}){return V.default.createElement("div",{className:"nxe-dialog-field"},e)}function Gt({copy:e,files:n,busy:t,error:r,onConfirm:l,onCancel:h}){let[f,w]=At(""),y=f.trim()==="";return V.default.createElement(Te,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:y,busy:t,error:r,onConfirm:()=>l(f),onCancel:h,description:e.commitBody(n.length)},V.default.createElement(Ut,null,V.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(p=>V.default.createElement("li",{key:p.path,title:p.path},`${p.status} ${p.path}`))),V.default.createElement(ut.Input,{value:f,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:p=>w(p.currentTarget.value)})))}function ht({copy:e,currentName:n,busy:t,error:r,onConfirm:l,onCancel:h,mode:f="rename"}){let[w,y]=At(n),p=w.trim()==="",o=f==="create";return V.default.createElement(Te,{copy:e,title:o?e.newEntryTitle:e.renameTitle,confirmLabel:o?e.create:e.confirm,busy:t,error:r,confirmDisabled:p,onConfirm:()=>l(w),onCancel:h,description:o?e.newEntryBody(n):e.renameBody(n)},V.default.createElement(Ut,null,V.default.createElement(ut.Input,{value:w,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:d=>y(d.currentTarget.value),onKeyDown:d=>{d.key==="Enter"&&!p&&(d.preventDefault(),l(w))}})))}var c=J(A("react"),1),U=A("@deepseek-ai/dsh-client-ui-primitives");function Ie(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,r=0;for(;t>=1024&&r<n.length-1;)t/=1024,r+=1;return`${r===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[r]}`}function Ht(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function jt(e){let n=[],t=[],r=[],l=[];for(let h of e??[]){if(h?.status==="U"){l.push(h);continue}if(h?.status==="?"){r.push(h);continue}h?.staged&&n.push({...h,status:h.staged}),h?.unstaged?t.push({...h,status:h.unstaged}):h?.staged||t.push(h)}return{staged:n,unstaged:t,untracked:r,conflicts:l}}function Wt(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function pt(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function _t(e,n,t){let r=new Map(e),l=n===""?"":`${n}/`;for(let h of r.keys())(l===""||h===n||h.startsWith(l))&&r.delete(h);for(let h of t)typeof h?.path=="string"&&h.path!==""&&r.set(h.path,h);return r}function qt(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let r=Math.floor(t/60);if(r<24)return{unit:"hours",value:r};let l=Math.floor(r/24);if(l<30)return{unit:"days",value:l};let h=new Date(e*1e3),f=w=>String(w).padStart(2,"0");return{unit:"date",value:`${h.getFullYear()}-${f(h.getMonth()+1)}-${f(h.getDate())}`}}var{useEffect:Yt,useState:qe}=c.default;function Yn(e,n){let t=qt(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function Jt(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function Kt(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(r=>String(r??"").toLowerCase().includes(t))}function Jn({file:e}){let{name:n,dir:t}=Wt(e.path);return c.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},c.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),c.default.createElement(U.FileTypeIcon,{kind:(0,U.classifyFileType)(n),size:16,className:"nxe-change-icon"}),c.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:c.default.createElement("span",{className:"nxe-change-dir"},t)))}function mt({label:e,count:n,files:t,tone:r}){return t.length===0?null:c.default.createElement("section",{className:"nxe-scm-group","data-tone":r??"default"},c.default.createElement("h3",{className:"nxe-local-head","data-tone":r??"default"},c.default.createElement("span",null,e),c.default.createElement("span",{className:"nxe-local-badge"},String(n))),c.default.createElement("ul",{className:"nxe-drawer-list"},t.slice(0,400).map(l=>c.default.createElement(Jn,{key:`${r??""}:${l.path}`,file:l}))))}function Vn({copy:e,history:n,currentBranch:t,upstream:r}){let l=n??[],h=r==null?-1:l.findIndex(f=>f.refs.includes(r));return c.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},c.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),l.length===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):c.default.createElement("ol",{className:"nxe-graph"},l.map((f,w)=>c.default.createElement("li",{key:`${f.hash}:${w}`,className:"nxe-graph-row","data-head":String(w===0),"data-ahead":String(h>=0&&w<h||h===-1&&r!=null),"data-boundary":String(h>=0&&w===h),title:[f.hash,Yn(e,f.time),f.subject].filter(y=>y!=="").join(" \xB7 ")},c.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},c.default.createElement("span",{className:"nxe-graph-dot"})),c.default.createElement("span",{className:"nxe-graph-subject"},c.default.createElement("span",{className:"nxe-graph-hash"},f.hash)," ",f.subject),c.default.createElement("span",{className:"nxe-graph-pills"},f.refs.slice(0,2).map(y=>c.default.createElement("span",{key:y,className:"nxe-pill","data-tone":y===t?"current":y===r?"upstream":"default",title:y},y)))))))}function Vt({copy:e,open:n,git:t,onClose:r,onPull:l,onRefresh:h,onCheckout:f,onOpenConflict:w,busy:y,error:p}){_e();let[o,d]=qe(""),[k,m]=qe(null);if(Yt(()=>{n||(d(""),m(null))},[n]),!n)return null;let S=Jt(t),g=t?.upstream??null,E=t?.behind??0,N=t?.ahead??0,z=t?.history??[],M=[...t?.branches??[]].sort((s,v)=>s.current===!0&&v.current!==!0?-1:v.current===!0&&s.current!==!0?1:s.name.localeCompare(v.name)).filter(s=>Kt(o,[s.name,s.upstream,s.commit])),O=(t?.worktrees??[]).filter(s=>Kt(o,[s.branch,s.path,s.head,pt(s.path)])),le=o.trim()!==""&&M.length===0&&O.length===0,W=t?.conflicts??[],de=e.branchDrawerSummary(S??e.detached,g===null?e.noUpstream:`${g} \xB7 ${e.factSyncValue(E,N)}`,e.worktreesHeadingCount((t?.worktrees??[]).length));return c.default.createElement(me,{copy:e,title:e.branchDrawerTitle,description:W.length===0?de:`${de} \xB7 ${e.factConflicted(W.length)}`,error:p,footer:c.default.createElement(c.default.Fragment,null,c.default.createElement(U.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:r},e.cancel),c.default.createElement(U.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{h()}},e.refreshGit),g===null?null:c.default.createElement(U.Button,{variant:"primary",className:"nano-modal-action",disabled:y===!0||E===0,title:E===0?e.pullNothing:e.pullNow,onClick:()=>{l()}},E>0?`${e.pullNow} ${E}`:e.pullNow)),onCancel:r},c.default.createElement("div",{className:"nxe-scm nxe-repo","data-nxe-scm":"branch"},W.length===0?null:c.default.createElement("section",{className:"nxe-repo-conflict","data-nxe-conflicts":String(W.length)},c.default.createElement("p",{className:"nxe-repo-conflict-title"},c.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!")," ",e.factConflicted(W.length)),c.default.createElement("p",{className:"nxe-drawer-empty"},e.branchConflictBlocks),c.default.createElement("ul",{className:"nxe-drawer-list nxe-repo-conflict-list"},W.map(s=>c.default.createElement("li",{key:s,className:"nxe-change","data-status":"U"},c.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),c.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:s,onClick:()=>w?.(s)},s))))),c.default.createElement(Vn,{copy:e,history:z,currentBranch:S,upstream:g}),c.default.createElement(U.Input,{value:o,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:s=>d(s.currentTarget.value)}),le?c.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):c.default.createElement(c.default.Fragment,null,c.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(M.length)),M.length===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):c.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},M.map(s=>c.default.createElement("li",{key:s.name,className:"nxe-drawer-row","data-current":String(s.current===!0),"data-blocked":String(s.inOtherWorktree===!0)},c.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:s.current===!0||s.inOtherWorktree===!0||y===!0||W.length>0,title:W.length>0?e.branchConflictBlocks:s.inOtherWorktree===!0?e.branchHeldElsewhere:s.name,onClick:()=>m(s.name),"data-nxe-checkout":s.name},s.name),s.commit===""?null:c.default.createElement("span",{className:"nxe-graph-hash"},s.commit),s.upstream===null?null:c.default.createElement("span",{className:"nxe-drawer-row-path",title:s.upstream},s.upstream),W.length>0&&s.current===!0?c.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"danger"},"!"):null,s.inOtherWorktree===!0?c.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):s.current===!0?c.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),c.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(O.length)),O.length===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):c.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},O.map(s=>{let v=s.path===t?.root,$=s.detached?e.detached:s.branch??e.detached,R=typeof s.head=="string"?s.head.slice(0,7):"";return c.default.createElement("li",{key:s.path,className:"nxe-worktree","data-current":String(v),title:s.path},c.default.createElement("span",{className:"nxe-worktree-mark","data-current":String(v),"aria-hidden":"true"}),c.default.createElement("span",{className:"nxe-worktree-body"},c.default.createElement("span",{className:"nxe-worktree-line"},c.default.createElement("span",{className:"nxe-worktree-branch"},$),R===""?null:c.default.createElement("span",{className:"nxe-graph-hash"},R),v?c.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),c.default.createElement("span",{className:"nxe-worktree-path"},pt(s.path))))})))),k===null?null:c.default.createElement(Te,{copy:e,title:e.checkoutTitle(k),description:e.checkoutBody(k),confirmLabel:e.checkoutConfirm,busy:y,onConfirm:()=>{let s=k;m(null),f(s)},onCancel:()=>m(null)},c.default.createElement("p",{className:"nxe-drawer-empty"},e.checkoutBody(k))))}function Xt({copy:e,open:n,git:t,onClose:r,onCommit:l,busy:h,error:f,refreshing:w,onOpenConflict:y}){_e();let[p,o]=qe(""),[d,k]=qe("all");if(Yt(()=>{n||k("all")},[n]),!n)return null;let m=t?.files??[],S=jt(m),g=S.conflicts.length>0?S.conflicts:(t?.conflicts??[]).map(O=>({path:O,status:"U"})),E=m.length,N=Jt(t),z=E>0&&g.length===0&&p.trim()!==""&&h!==!0,M=()=>{z&&Promise.resolve(l(p)).then(O=>{O===!0&&o("")})};return c.default.createElement(me,{copy:e,title:c.default.createElement("span",{className:"nxe-drawer-title"},e.commitDrawerTitle,w===!0?c.default.createElement(U.IconLoadingOutlineRegular,{width:15,height:15,className:"nxe-drawer-spin","aria-label":e.commitRefreshing??"refreshing",role:"status"}):null),description:e.commitDrawerBody(E,N??(t?.detached?e.detached:null)),error:f,footer:c.default.createElement(c.default.Fragment,null,c.default.createElement(U.Button,{variant:"outline",className:"nano-modal-action nxe-drawer-close",onClick:r},e.cancel),c.default.createElement(U.Button,{variant:"primary",className:"nano-modal-action",disabled:!z,onClick:M},e.commit)),onCancel:r},c.default.createElement("div",{className:"nxe-scm nxe-local","data-nxe-scm":"commit"},c.default.createElement(U.Input,{value:p,placeholder:N===null?e.commitPlaceholder:e.commitPlaceholderOn(N),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:O=>o(O.currentTarget.value),onKeyDown:O=>{O.key==="Enter"&&(O.metaKey||O.ctrlKey)&&(O.preventDefault(),M())}}),c.default.createElement("div",{className:"nxe-local-filters",role:"group","aria-label":e.filterChanges},[{id:"all",label:e.filterAll,count:E},{id:"staged",label:e.localStaged,count:S.staged.length},{id:"unstaged",label:e.localUnstaged,count:S.unstaged.length},{id:"untracked",label:e.localUntracked,count:S.untracked.length},...g.length===0?[]:[{id:"conflict",label:e.localConflicts,count:g.length}]].map(O=>c.default.createElement(U.Button,{key:O.id,variant:d===O.id?"primary":"outline",className:"nxe-local-filter",disabled:O.id!=="all"&&O.count===0,"aria-pressed":String(d===O.id),onClick:()=>k(O.id)},`${O.label} ${O.count}`))),d!=="all"&&d!=="conflict"||g.length===0?null:c.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},c.default.createElement("h3",{className:"nxe-local-head","data-tone":"danger"},c.default.createElement("span",null,e.localConflicts),c.default.createElement("span",{className:"nxe-local-badge"},String(g.length))),c.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),c.default.createElement("ul",{className:"nxe-drawer-list"},g.map(O=>c.default.createElement("li",{key:O.path,className:"nxe-change","data-status":"U"},c.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),c.default.createElement(U.FileTypeIcon,{kind:(0,U.classifyFileType)(O.path),size:16,className:"nxe-change-icon"}),c.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:O.path,onClick:()=>y(O.path)},O.path))))),E===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):c.default.createElement(c.default.Fragment,null,d==="all"||d==="staged"?c.default.createElement(mt,{label:e.localStaged,count:S.staged.length,files:S.staged,tone:"staged"}):null,d==="all"||d==="unstaged"?c.default.createElement(mt,{label:e.localUnstaged,count:S.unstaged.length,files:S.unstaged,tone:"unstaged"}):null,d==="all"||d==="untracked"?c.default.createElement(mt,{label:e.localUntracked,count:S.untracked.length,files:S.untracked,tone:"untracked"}):null)))}var j=J(A("react"),1),an=A("@deepseek-ai/dsh-client-ui-primitives");var Zt="dsh-nano-explorer-extra:prefs.v2",Xn="dsh-nano-explorer-extra:prefs.v1",Ce={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function en(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qt(e){let n=en(e)?e:{},t={};for(let[r,l]of Object.entries(Ce))t[r]=typeof n[r]=="boolean"?n[r]:l;return t}function tn(){try{let e=window.localStorage?.getItem(Zt);if(e!=null)return Qt(JSON.parse(e));let n=window.localStorage?.getItem(Xn);if(n==null)return{...Ce};let t=JSON.parse(n),r=en(t)?{...t}:{};return delete r.openPreviewOnClick,delete r.openPreviewOnDoubleClick,Qt(r)}catch{return{...Ce}}}function nn(e){try{window.localStorage?.setItem(Zt,JSON.stringify(e))}catch{}}function fe({label:e,hint:n,checked:t,onChange:r,warn:l}){return j.default.createElement("div",{className:"nxe-settings-row"},j.default.createElement("div",null,j.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:j.default.createElement("div",{className:"nxe-settings-hint"},n),l===!0?j.default.createElement("p",{className:"nxe-warn"},n):null),j.default.createElement(an.Switch,{checked:t,label:e,onChange:r}))}function rn({copy:e,open:n,prefs:t,setPref:r,onClose:l}){if(!n)return null;let h=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return j.default.createElement(me,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:l,onConfirm:l},j.default.createElement(fe,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:f=>r("openPreviewOnClick",f)}),j.default.createElement(fe,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:f=>r("openPreviewOnDoubleClick",f)}),h?j.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,j.default.createElement(fe,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:f=>r("showOpenButton",f)}),j.default.createElement(fe,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:f=>r("showIgnoredBadge",f)}),j.default.createElement(fe,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:f=>r("showGitStatus",f)}),j.default.createElement(fe,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:f=>r("showSystemFiles",f)}),j.default.createElement(fe,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:f=>r("showStatusBar",f)}),j.default.createElement(fe,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:f=>r("statsExcludeGit",f)}))}var ae=J(A("react"),1),$e=A("@deepseek-ai/dsh-client-ui-primitives");function on(e){return function({entry:t}){let r=e.copy(),l=e.statusOf(t.path),h=e.ignoredOf(t.path),f=e.linkOf(t.path),w=e.linkBrokenOf(t.path)===!0,y=t.meta?.kind!=="directory",p=y?void 0:e.folderStatusOf(t.path),o=e.showGit()&&!h,d=o?e.stagedOf(t.path):void 0,k=o?e.unstagedOf(t.path):void 0,m=o?e.remoteOf(t.path):void 0;return ae.default.createElement("span",{className:"nxe-acc",...h?{"data-nxe-ignored":"true"}:{}},f===void 0?null:ae.default.createElement("span",{className:"nxe-acc-link",title:w?r.linkBroken:f?r.symlinkOutsideBadge:r.symlinkBadge,"aria-label":w?r.linkBroken:f?r.symlinkOutsideBadge:r.symlinkBadge,"data-nxe-symlink":w?"broken":f?"outside":"inside"},ae.default.createElement($e.IconLinkOutlineRegular,{width:14,height:14,"aria-hidden":"true"})),m===void 0?null:ae.default.createElement("span",{className:"nxe-acc-remote","data-status":m.status,"data-direction":m.direction,title:m.direction==="pulled"?r.remotePulled(m.status):r.remotePushed(m.status),"aria-label":m.direction==="pulled"?r.remotePulled(m.status):r.remotePushed(m.status)},`${m.direction==="pulled"?"\u2193":"\u2191"}${m.status}`),o&&l!==void 0?ae.default.createElement("span",{className:"nxe-acc-letter","data-status":l,"data-staged":d===void 0?"false":"true",title:e.statusLabel(l,d,k),"aria-label":e.statusLabel(l,d,k)},l):null,o&&p!==void 0?ae.default.createElement("span",{className:"nxe-acc-dot","data-status":p,title:e.statusLabel(p),"aria-label":e.statusLabel(p)}):null,h&&e.showIgnoredBadge()?ae.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:r.ignoredBadge,"aria-label":r.ignoredBadge},ae.default.createElement($e.IconCloseCircleFillRegular,{width:14,height:14,"aria-hidden":"true"})):null,y&&e.showOpenButton()?ae.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:r.openFile,"aria-label":`${r.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:S=>{S.stopPropagation(),e.open(t)}},ae.default.createElement($e.IconRightUpOutlineRegular,{width:12,height:12,"aria-hidden":"true"})):null)}}var D=J(A("react"),1);var q=A("@deepseek-ai/dsh-client-ui-primitives");function ft({icon:e,value:n,title:t,scope:r}){return D.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":r},e,D.default.createElement("span",{className:"nxe-figure-value"},n))}function sn(e){let{copy:n,git:t,stats:r,statsState:l,prefs:h,onOpenBranch:f,onOpenCommit:w}=e,y=(0,D.useRef)(null),[p,o]=(0,D.useState)(!1),d=(0,D.useRef)(0);if((0,D.useEffect)(()=>{let S=y.current;if(!S)return;let g=()=>{let N=S.clientWidth;S.scrollWidth>N+1?(d.current=S.scrollWidth,o(!0)):p&&N>=d.current+32&&o(!1)};g();let E=new ResizeObserver(g);return E.observe(S),()=>E.disconnect()},[p]),!h.showStatusBar)return null;let k=[];if(t==null)k.push(D.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},D.default.createElement(q.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),D.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let S=t.detached?n.detached:t.branch??n.detached,g=t.files?.length??0,E=t.conflicts?.length??0,N=g>0;k.push(D.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(N),"data-conflicted":String(E>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(S,N,E),"aria-label":n.branchButtonTooltip(S,N,E),onClick:f},D.default.createElement(q.IconBranchOutlineRegular,{width:14,height:14}),D.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},S),N?D.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,E>0?D.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&k.push(D.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},D.default.createElement(q.IconArchiveOutlineRegular,{width:14,height:14}),D.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let z=t.upstream===null||t.upstream===void 0?void 0:Ht(t.ahead??0,t.behind??0);k.push(D.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(g),title:n.commitButtonTooltip(g,z===void 0?null:z),"aria-label":n.commitButtonTooltip(g,z===void 0?null:z),onClick:w},D.default.createElement(q.IconRefreshOutlineRegular,{width:14,height:14}),z===void 0?null:D.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},z),D.default.createElement("span",{className:"nxe-chip-badge","data-nxe-pending":String(g),"data-empty":String(g===0)},String(g))))}let m=[];if(!p){if(l==="loading")m.push(D.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(l==="failed")m.push(D.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(r!=null){let S=r.truncated?"+":"",g=h.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";m.push(D.default.createElement(ft,{key:"dirs",scope:"directories",icon:D.default.createElement(q.IconFolderCloseRegular,{width:14,height:14}),value:`${r.directories}${S}`,title:n.statsTooltip(r.files,r.directories,Ie(r.bytes))+g})),m.push(D.default.createElement(ft,{key:"files",scope:"files",icon:D.default.createElement(q.IconDeliverDocRegular,{width:14,height:14}),value:`${r.files}${S}`,title:n.statsTooltip(r.files,r.directories,Ie(r.bytes))+g})),m.push(D.default.createElement(ft,{key:"bytes",scope:"bytes",icon:D.default.createElement(q.IconGaugeOutlineRegular,{width:14,height:14}),value:Ie(r.bytes),title:n.statsSizeTooltip(Ie(r.bytes))+g}))}}return m.push(D.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},D.default.createElement(q.IconSettingsOutlineRegular,{width:14,height:14}))),D.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true","data-crowded":String(p),ref:y},D.default.createElement("div",{className:"nxe-status-left"},k),D.default.createElement("div",{className:"nxe-status-right"},m))}var ln=J(A("react"),1);function dn({menu:e,actions:n,onClose:t}){return ln.default.createElement(lt,{menu:e,actions:n,onClose:t})}var P=J(A("@deepseek-ai/dsh-client-ui-primitives"),1);function re(e,n){let t=se(e),r=String(n??"").replace(/\\/gu,"/");return r===""?t:r.startsWith("/")||/^[A-Za-z]:\//u.test(r)?se(r):`${t==="/"?"":t}/${r}`.replace(/\/{2,}/gu,"/")}function X(e,n){return se(re(e,n))}function Qn(e,n){let t=se(e),r=se(n);return t===r?!0:r.startsWith(t==="/"?"/":`${t}/`)}function Q(e,n){let t=se(e),r=se(n);return r===t?"":Qn(t,r)?r.slice(t==="/"?1:t.length+1):r}function Oe(e){let n=se(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Pe(e){let n=se(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function se(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var Zn=5*60*1e3,ea=20*1e3,ta=2e3,gt=new Map;async function Fe(e,n){try{let t=await fetch(`/nano-explorer-extra${e}`,{method:n===void 0?"GET":"POST",headers:n===void 0?void 0:{"content-type":"application/json"},body:n===void 0?void 0:JSON.stringify(n),credentials:"same-origin",cache:"no-store"}),r=await t.json().catch(()=>({error:`HTTP ${t.status}`}));return t.ok?{ok:!0,...r}:{ok:!1,message:r?.error??`HTTP ${t.status}`}}catch(t){return{ok:!1,message:t instanceof Error?t.message:String(t)}}}function na(e){let n=new Set,t=new Set,r=new Map,l={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},h=0,f=0,w=0,y=0,p=()=>!0,o=s=>{l={...l,...s};for(let v of n)v()},d=(s,v)=>{let $=r.get(s);if($!==void 0)return $;let R=v().finally(()=>{r.get(s)===R&&r.delete(s)});return r.set(s,R),R},k=(s,v,$=!1)=>d(`level:${v}`,async()=>{let R=X(e,v);if(!$){let te=new Map(l.levels);te.get(R)===void 0&&te.set(R,{loading:!0,entries:[]}),te!==l.levels&&o({levels:te})}let C=await Fe("/list",{sessionId:s,path:v});y=Date.now();let G=new Map(l.levels),I=G.get(R);return C.ok?G.set(R,{entries:C.entries,truncated:C.truncated===!0,outside:C.outside===!0,failed:I?.failed===!0&&I.entries?.length>0?I.failed:!1}):G.set(R,{entries:I?.entries??[],failed:!0,message:C.message,code:C.code}),o({levels:G}),C.ok&&C.entries.length>0&&m(s,v,C.entries.map(te=>te.name)),C}),m=(s,v,$)=>!p()||!Array.isArray($)||$.length===0?Promise.resolve():d(`ignored:${v}:${$.join(",")}`,async()=>{let R=await Fe("/ignored",{sessionId:s,paths:$});if(!R.ok||!Array.isArray(R.ignored)||R.ignored.length===0)return;let C=new Set(l.ignoredSet),G=Q(e,v);for(let I of R.ignored)C.add(G===""?I:`${G}/${I}`);o({ignoredSet:C})}),S=(s,v)=>p()?d(`dirstatus:${v}:${h}`,async()=>{let $=h,R=await Fe(`/status?sessionId=${encodeURIComponent(s)}&path=${encodeURIComponent(v)}`);if($!==h||!R.ok||R.git===null||R.git===void 0)return;let C=R.git.root,G=C??e,I=Q(G,v);if(I===v&&I!=="")return;let te=[];for(let ie of R.git.files??[]){let ke=C===void 0?ie.path:`${C.replace(/\/+$/u,"")}/${ie.path}`,Me=Q(G,ke);Me!==ke&&te.push({...ie,path:Me})}o({directoryStatus:_t(l.directoryStatus,I,te)})}):Promise.resolve(),g=s=>p()?d("git",async()=>{let v=h+1;h=v;let $=await Fe(`/status?sessionId=${encodeURIComponent(s)}`);if(v===h){if(!$.ok){o({gitError:$.message});return}o({git:$.git??null,gitError:$.gitError,directoryStatus:new Map});for(let R of l.expanded)S(s,R)}}):((l.git!==null||l.gitError!==void 0||l.directoryStatus.size!==0)&&o({git:null,gitError:void 0,directoryStatus:new Map}),Promise.resolve()),E=s=>d("stats",async()=>{o({statsState:"loading"});let v=await Fe(`/status?sessionId=${encodeURIComponent(s)}&only=stats`);if(!v.ok){o({statsState:"failed"});return}o({stats:v.stats??null,statsState:"ok"})}),N=s=>{clearTimeout(f),f=setTimeout(()=>{E(s)},ta)},z=(s,v,$)=>{let R=X(e,v),C=new Set(l.expanded);$?C.add(R):C.delete(R),(C.size!==l.expanded.size||![...C].every(G=>l.expanded.has(G)))&&o({expanded:C}),$&&l.levels.get(R)===void 0&&k(s,v)},M=s=>{let v=[...l.expanded];k(s,e,!0);for(let $ of v)k(s,$,!0);y=Date.now()};return{root:e,get state(){return l},subscribe:s=>(n.add(s),()=>n.delete(s)),mountCount:()=>t.size,mount:s=>{clearTimeout(w),typeof s?.showGitStatus=="function"&&(p=s.showGitStatus);let v={};return t.add(v),l.levels.size===0?k(s.sessionId,e):Date.now()-y>ea&&M(s.sessionId),v},unmount:s=>{t.delete(s),t.size===0&&(w=setTimeout(()=>gt.delete(e),Zn))},loadLevel:k,markIgnored:m,loadDirectoryStatus:S,refreshGit:g,refreshStats:E,queueStats:N,toggle:z,refresh:M,refreshLevel:(s,v)=>k(s,v,!0),knownEmpty:s=>{let v=X(e,s);if(l.levels.has(v))return;let $=new Map(l.levels);$.set(v,{entries:[]}),o({levels:$})},forget:s=>{let v=X(e,s);if(!l.levels.has(v))return;let $=new Map(l.levels);$.delete(v),o({levels:$})},collapseUnder:s=>{let v=X(e,s),$=new Set;for(let C of l.expanded)C!==v&&!C.startsWith(`${v}/`)&&$.add(C);let R=new Map;for(let[C,G]of l.levels)C!==v&&!C.startsWith(`${v}/`)&&R.set(C,G);o({expanded:$,levels:R})},dismissGitError:()=>{l.gitError!==void 0&&o({gitError:void 0})}}}function cn(e){let n=gt.get(e);if(n!==void 0)return n;let t=na(e);return gt.set(e,t),t}var aa=".md";function un(e,n){let t=e==="file"?"untitled":"new-folder",r=new Set((n??[]).map(h=>String(h.name??"").toLowerCase())),l=h=>e==="file"?`${t}${h===1?"":`-${h}`}${aa}`:`${t}${h===1?"":`-${h}`}`;for(let h=1;h<1e4;h+=1){let f=l(h);if(!r.has(f.toLowerCase()))return f}throw new Error("cannot find an unused name")}function hn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:B,useEffect:ge,useMemo:ee,useRef:ye,useState:K,useSyncExternalStore:pn}=b.default,ra=400,ia=15e3,mn={levels:new Map,expanded:new Set,ignoredSet:new Set,directoryStatus:new Map,git:null,gitError:void 0,stats:null,statsState:"idle"},oa={levels:new Map,entries:[],directories:{},expanded:[],selected:null,setSelected:()=>{},loadLevel:()=>Promise.resolve(),refreshLevel:()=>Promise.resolve(),toggle:()=>{},refresh:()=>Promise.resolve(),forget:()=>{},collapseUnder:()=>{},knownEmpty:()=>{},pending:null,setPending:()=>{}},sa=["U","D","M","A","R","?"],la=new Set([".git",".DS_Store"]);function fn(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function gn(e){let{useTabInfo:n,sessionId:t,useSessions:r,renderSlot:l,renderFactorySlot:h,useContextMenu:f,nxe:w}=e,{tab:y,panel:p}=n(),o=r(a=>a.byId[t]?.cwd),d=w.copy,k=pn(w.subscribePrefs,w.getPrefs,w.getPrefs),m=ee(()=>o===void 0?null:cn(o),[o]),S=pn(B(a=>m?.subscribe(a)??(()=>{}),[m]),B(()=>m?.state??mn,[m]),()=>mn),{git:g,gitError:E,stats:N,statsState:z,ignoredSet:M,directoryStatus:O}=S,[le,W]=K(null),[de,s]=K(null),[v,$]=K(!1),[R,C]=K(void 0),[G,I]=K(void 0),[te,ie]=K(void 0),[ke,Me]=K([]);ge(()=>{let a=!0;return(async()=>{try{let i=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!i.ok)return;let u=await i.json(),T=Array.isArray(u.apps)?u.apps:[];a&&Me(T.filter(F=>typeof F=="string"))}catch{}})(),()=>{a=!1}},[]);let[Be,Le]=K(null),[L,Ve]=K(null),[Ae,Ue]=K(null),[bt,Ee]=K(null),[vn,Xe]=K(!1),[vt,Se]=K(!1),[yt,oe]=K(void 0),[yn,Qe]=K(!1),xe=ye(0);ge(()=>{Ee(null),oe(void 0),Qe(!1),Xe(!1),s(null),C(void 0),Le(null),Ue(null),Ve(null)},[t,o,y.visible]);let kt=ye({path:"",at:0}),Ge=ye(k);Ge.current=k;let H=B(async(a,i)=>{try{let u=await fetch(`/nano-explorer-extra${a}`,{method:i===void 0?"GET":"POST",headers:i===void 0?void 0:{"content-type":"application/json"},body:i===void 0?void 0:JSON.stringify(i),credentials:"same-origin",cache:"no-store"}),T=await u.json().catch(()=>({error:`HTTP ${u.status}`}));return u.ok?{ok:!0,...T}:{ok:!1,message:T?.error??`HTTP ${u.status}`}}catch(u){return{ok:!1,message:u instanceof Error?u.message:String(u)}}},[]);ge(()=>{if(m===null)return;let a=m.mount({sessionId:t,showGitStatus:()=>Ge.current.showGitStatus});return()=>m.unmount(a)},[m,t]);let Et=ee(()=>{let a=[];for(let[i,u]of S.levels)for(let T of u.entries??[]){let F=i===""?T.name:`${i}/${T.name}`;a.push({...T,path:F})}return a},[S.levels]),St=ee(()=>{let a={};for(let[i,u]of S.levels)u.loading===!0&&(u.entries?.length??0)===0?a[i]={loading:!0}:u.failed===!0?a[i]={failure:u.message}:u.truncated===!0&&(a[i]={truncated:!0});return a},[S.levels]),x=ee(()=>m===null?oa:{levels:S.levels,entries:Et,directories:St,expanded:[...S.expanded],selected:le,setSelected:W,loadLevel:(a,i)=>m.loadLevel(t,a,i),refreshLevel:a=>m.refreshLevel(t,a),toggle:(a,i)=>m.toggle(t,a,i),refresh:()=>Promise.resolve(m.refresh(t)),forget:a=>m.forget(a),collapseUnder:a=>m.collapseUnder(a),knownEmpty:a=>m.knownEmpty(a),pending:null,setPending:()=>{}},[m,S.levels,S.expanded,Et,St,le,t]),_=B(()=>m?.refreshGit(t)??Promise.resolve(),[m,t]),ne=B(()=>m?.refreshStats(t)??Promise.resolve(),[m,t]),Nt=B(a=>{m?.loadDirectoryStatus(t,a)},[m,t]),Tt=B(a=>{Ee(a),oe(void 0),Qe(!0),_().finally(()=>Qe(!1))},[_]);ge(()=>{_()},[_]),ge(()=>{ne()},[ne]);let Ct=ye(null);ge(()=>{if(m===null)return;let a=window.setInterval(()=>{let i=Ct.current;i===null||i.closest('[hidden], [aria-hidden="true"]')!==null||m.refreshGit(t)},ia);return()=>window.clearInterval(a)},[m,t]);let ce=B(()=>{m?.queueStats(t)},[m,t]);ge(()=>()=>{window.clearTimeout(xe.current)},[]);let kn=ee(()=>{let a=new Map;for(let i of x.entries)i.symlink===!0&&a.set(i.path,{outside:i.outside===!0});return a},[x.entries]),Ze=ee(()=>Array.isArray(g?.files)?g.files:[],[g]),et=ee(()=>{let a=new Map;for(let i of Ze)a.set(i.path,i);return a},[Ze]),He=g?.root,ue=ee(()=>{if(O.size===0)return et;let a=new Map(et);for(let[i,u]of O)a.set(i,u);return a},[et,O]),Z=B(a=>{if(He==null)return;let i=re(o??"",a);return Q(He,i)},[He,o]),tt=B(a=>{let i=Z(a);if(i===void 0)return!1;if(M.has(i))return!0;let u=i.split("/");for(let T=u.length-1;T>0;T-=1)if(M.has(u.slice(0,T).join("/")))return!0;return!1},[M,Z]),$t=B(a=>{let i=Z(a);if(i!==void 0)return ue.get(i)?.status},[ue,Z]),En=B(a=>{let i=Z(a);if(i!==void 0)return ue.get(i)?.staged},[ue,Z]),Sn=B(a=>{let i=Z(a);if(i!==void 0)return ue.get(i)?.unstaged},[ue,Z]),Ot=ee(()=>{let a=new Map;for(let i of g?.remote?.pushed??[])a.set(i.path,{status:i.status,direction:"pushed"});for(let i of g?.remote?.pulled??[])a.set(i.path,{status:i.status,direction:"pulled"});return a},[g]),Nn=B(a=>{let i=Z(a);if(i!==void 0)return Ot.get(i)},[Ot,Z]),we=B(a=>{let i=re(o??"",a.path),u=o??"",T=Q(u,i),Y=u!==""&&T!==i?`dsh-resource://file/session/${encodeURIComponent(t)}/${fn(T)}`:`dsh-resource://file/absolute/${fn(i.replace(/^\/+/,""))}`;p.isFloating?y.actions.openResource(Y):y.actions.openResource(Y,{paneId:p.id})},[o,t,y.actions,p.id,p.isFloating]),nt=B(async a=>{let i=await x.loadLevel(a.path);x.toggle(a.path,!0),i?.ok&&Nt(a.path)},[x,Nt]),Tn=B(async a=>{$(!0);let i=await H("/delete",{sessionId:t,path:a.path,kind:a.kind==="directory"?"directory":"file"});if($(!1),!i.ok){I(i.message);return}Ue(null),I(void 0),x.forget(a.path),x.collapseUnder(a.path);let u=Oe(a.path);u!==a.path&&await x.refreshLevel(u),x.selected===a.path&&x.setSelected(null),ce()},[t,H,x,ce]),Dt=B(a=>{if(o===void 0)return;let i=da(x,o),u=ca(x,o,i);I(void 0),Le({kind:a,directory:i,proposed:un(a,u)})},[o,x]),Cn=B(async a=>{if(Be===null)return;let{kind:i,directory:u}=Be,T=hn(a,d);if(!T.ok){I(T.message);return}$(!0);let F=await H(i==="file"?"/create-file":"/create-folder",{sessionId:t,directory:u,name:T.name});if($(!1),!F.ok){I(F.message);return}Le(null),I(void 0),await x.refreshLevel(u);let Y=Q(o??"",u),Ne=re(o??"",`${Y===""?"":`${Y}/`}${T.name}`);x.setSelected(Ne),i==="folder"&&(x.knownEmpty(Ne),x.toggle(Ne,!0)),ce()},[Be,d,o,t,H,x,ce]),$n=B(async(a,i)=>{if(o===void 0)return;let u=re(o,a.path),T=a.meta?.kind==="directory"?"directory":"file";$(!0),C(void 0);let F=await H("/rename",{sessionId:t,path:u,name:i,kind:T});if($(!1),!F.ok){C(F.message);return}s(null);let Y=Oe(u);await x.refreshLevel(Y),T==="directory"&&x.collapseUnder(u),x.setSelected(re(o,`${Q(o,Y)===""?"":`${Q(o,Y)}/`}${i.trim()}`)),ce()},[o,t,H,x,ce]),at=B(async(a,i)=>{if(o===void 0)return;let u=re(o,a.path),T=await H("/move",{sessionId:t,path:u,directory:i});if(!T.ok){ie(T.message),window.clearTimeout(xe.current),xe.current=window.setTimeout(()=>ie(void 0),4e3);return}let F=Oe(u);await x.refreshLevel(F),await x.refreshLevel(i),a.meta?.kind==="directory"&&x.collapseUnder(u),x.selected===u&&x.setSelected(T.path),ce(),_()},[o,t,H,x,ce,_]),On=B(async a=>{$(!0),C(void 0);let i=await H("/commit",{sessionId:t,message:a});if($(!1),!i.ok){C(i.message);return}s(null),await x.refresh(),await _(),await ne()},[t,H,x,_,ne]),Rt=B(async()=>{Se(!0),oe(void 0);let a=await H("/pull",{sessionId:t});if(Se(!1),!a.ok){oe(a.message);return}await x.refresh(),await _(),await ne()},[t,H,x,_,ne]),Dn=B(async a=>{Se(!0),oe(void 0);let i=await H("/checkout",{sessionId:t,branch:a});if(Se(!1),!i.ok){oe(i.message);return}ie(d.branchSwitched(a)),window.clearTimeout(xe.current),xe.current=window.setTimeout(()=>ie(void 0),2e3),await x.refresh(),await _(),await ne()},[t,H,x,_,ne,d]),Rn=B(async a=>{Se(!0),oe(void 0);let i=await H("/commit",{sessionId:t,message:a});return Se(!1),i.ok?(await x.refresh(),await _(),await ne(),!0):(oe(i.message),!1)},[t,H,x,_,ne]),rt=B(async(a,i)=>{try{await navigator.clipboard.writeText(i||a),ie(d.copied),window.clearTimeout(xe.current),xe.current=window.setTimeout(()=>ie(void 0),1600)}catch(u){I(u instanceof Error?u.message:String(u))}},[d.copied]),it=ye(0),he=ye(null),ot=ye("file"),pe=B(()=>{window.clearTimeout(it.current),it.current=0,he.current!==null&&he.current.removeAttribute("data-nxe-drop"),he.current=null},[]),je=B((a,i)=>{pe(),he.current=i,i.setAttribute("data-nxe-drop","true"),a!==null&&!x.expanded.includes(a.path)&&(it.current=window.setTimeout(()=>{nt(a)},650))},[pe,nt,x.expanded]),st=B(a=>(a.preventDefault(),a.stopPropagation(),pe(),a.dataTransfer?.getData("application/x-nxe-move")??""),[pe]),Bn=B((a,i)=>({draggable:!0,onDragStart:u=>{ot.current=i,u.dataTransfer?.setData("application/x-nxe-move",a.path),u.dataTransfer&&(u.dataTransfer.effectAllowed="move")},onDragEnd:pe,onContextMenu:u=>{u.preventDefault(),u.stopPropagation(),x.setSelected(a.path),Ve({x:u.clientX,y:u.clientY,path:a.path,name:a.name,kind:i,openedAt:Date.now()})},onDragOver:i==="directory"?u=>{u.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(u.preventDefault(),u.stopPropagation(),u.dataTransfer.dropEffect="move",he.current!==u.currentTarget&&je(a,u.currentTarget))}:void 0,onDragEnter:i==="directory"?u=>{u.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(u.currentTarget.contains(u.relatedTarget)||je(a,u.currentTarget))}:void 0,onDragLeave:i==="directory"?u=>{u.relatedTarget instanceof Node&&u.currentTarget.contains(u.relatedTarget)||he.current===u.currentTarget&&pe()}:void 0,onDrop:i==="directory"?u=>{let T=st(u);T!==""&&at({path:T,meta:{kind:ot.current}},a.path)}:void 0}),[x,pe,je,st,at]),zn=B(a=>{let i=Z(a);if(i===void 0)return;let u=i===""?"":`${i}/`,T,F=-1;for(let[Y,Ne]of ue){if(u!==""&&!Y.startsWith(u))continue;let zt=sa.indexOf(Ne.status);zt>F&&(F=zt,T=Ne.status)}return T},[ue,Z]),Bt=ee(()=>on({copy:()=>d,statusOf:$t,stagedOf:En,unstagedOf:Sn,remoteOf:Nn,ignoredOf:tt,folderStatusOf:zn,linkBrokenOf:a=>x.levels.get(X(o??"",a))?.code==="broken-link",linkOf:a=>{let i=kn.get(a);if(i!==void 0)return i.outside===!0},showGit:()=>k.showGitStatus,showIgnoredBadge:()=>k.showIgnoredBadge,showOpenButton:()=>k.showOpenButton,statusLabel:a=>w.statusLabel(d,a),open:a=>we(a)}),[d,$t,tt,x.levels,o,k.showGitStatus,k.showIgnoredBadge,k.showOpenButton,w,we]),In=ee(()=>({slots:{accessory:Bt},fallback:null}),[Bt]);if(o===void 0)return b.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},d.noWorkspace);let Pn=x.entries.filter(a=>k.showSystemFiles||!la.has(a.name)).map(a=>({path:a.path,name:a.name,meta:{kind:a.type==="directory"?"directory":a.type==="file"?"file":"other",...a.symlink===!0?{link:!0}:{},...a.outside===!0?{outside:!0}:{},...tt(a.path)?{hidden:!0}:{}}})),Fn=h("sidebar.files.tree",{root:X(o,o),entries:Pn,expanded:x.expanded,directories:x.directories,current:x.selected===null?void 0:X(o,x.selected),onToggle:a=>{if(x.expanded.includes(a.path)){x.toggle(a.path,!1);return}nt(a)},onOpen:a=>{x.setSelected(a.path);let i=Date.now(),u=kt.current,T=u.path===a.path&&i-u.at<=ra;kt.current={path:a.path,at:i},(T?Ge.current.openPreviewOnDoubleClick:Ge.current.openPreviewOnClick)&&we(a)},rowTriggerProps:Bn,canOpen:()=>!0},In);ge(()=>{let a=i=>{C(void 0),s({kind:"rename",entry:{path:i.path,name:Pe(i.path),meta:{kind:i.kind}}})};return w.setRenameHandler(a),()=>w.setRenameHandler(void 0)},[w]);let Mn=B(a=>{if(x.pending!==null)return;if(a.key==="F2"&&x.selected!==null){a.preventDefault(),C(void 0),s({kind:"rename",entry:{path:x.selected,name:Pe(x.selected),meta:{kind:x.levels.has(x.selected)?"directory":"file"}}});return}let i=x.selected;if(i===null)return;let u=X(o??"",i),T=x.levels.has(u)||x.expanded.includes(u);if(a.key===" "){if(!T)return;a.preventDefault(),x.toggle(i,!x.expanded.includes(u));return}if(a.key==="Enter"){if(a.preventDefault(),T){x.toggle(i,!x.expanded.includes(u));return}we({path:u,name:Pe(i),meta:{kind:"file"}})}},[x,o,we]),Ln=de===null?null:de.kind==="commit"?b.default.createElement(Gt,{copy:d,files:Ze,busy:v,error:R,onConfirm:On,onCancel:()=>{s(null),C(void 0)}}):b.default.createElement(ht,{copy:d,currentName:de.entry.name,busy:v,error:R,onConfirm:a=>$n(de.entry,a),onCancel:()=>{s(null),C(void 0)}}),An=ee(()=>{if(L===null)return[];let a={path:L.path,name:L.name,kind:L.kind},i=ke[0],u=T=>{let F=re(o??"",L.path),Y=L.kind==="directory"?F:Oe(F);fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:T,path:Y}),credentials:"same-origin"})};return[i===void 0?null:{id:"reveal",label:d.revealIn(Ye[i]??i),icon:b.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(i)}`,alt:"",width:14,height:14}),run:()=>{u(i)}},{id:"copy-path",label:d.copyAbsolute,icon:b.default.createElement(P.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{rt(L.path,L.path)}},{id:"copy-relative",label:d.copyRelative,icon:b.default.createElement(P.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{rt(L.path,Q(o??"",L.path))}},L.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:d.openInNotepad,icon:b.default.createElement(P.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let T=await H("/read",{sessionId:t,path:L.path});if(!T.ok){I(T.message??d.openInNotepadFail);return}I(void 0);let F=L.path.startsWith("/")?L.path:`${o??""}/${L.path}`;await window.__nanoNotepad.import(L.name,T.content,{sourcePath:F})}},{id:"rename",label:d.rename,icon:b.default.createElement(P.IconEditOutlineRegular,{width:14,height:14}),run:()=>{C(void 0),s({kind:"rename",entry:{...a,meta:{kind:L.kind}}})}},{id:"delete",label:d.delete,tone:"danger",icon:b.default.createElement(P.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{I(void 0),Ue(a)}}].filter(Boolean)},[L,d,ke,o,rt]);return b.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":w.scheme(),ref:Ct},b.default.createElement("div",{className:"nxe-header"},b.default.createElement("span",{className:"nxe-path",title:o,"data-nxe-path":"true"},o),b.default.createElement(Ke,{label:d.newFile,onClick:()=>{Dt("file")}},fa()),b.default.createElement(Ke,{label:d.newFolder,onClick:()=>{Dt("folder")}},ga()),b.default.createElement(Ke,{label:d.rename,disabled:x.selected===null,onClick:()=>{let a=x.selected;a!==null&&(C(void 0),s({kind:"rename",entry:{path:a,name:Pe(a),meta:{kind:x.levels.has(a)?"directory":"file"}}}))}},wa()),b.default.createElement(ba,{copy:d,cwd:o??"",apps:ke}),b.default.createElement(Ke,{label:d.reload,onClick:()=>{x.refresh(),_()}},xa())),G===void 0?null:b.default.createElement("p",{className:"nxe-row-note",role:"status"},G),Ae===null?null:b.default.createElement(Te,{copy:d,title:d.deleteTitle,busy:v,confirmLabel:d.delete,onConfirm:()=>{Tn(Ae)},onCancel:()=>{Ue(null),I(void 0)},description:b.default.createElement(b.default.Fragment,null,d.deleteBody(Ae.name),Ae.kind==="directory"?b.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${d.deleteFolderNote}`):null)}),Be===null?null:b.default.createElement(ht,{copy:d,mode:"create",busy:v,currentName:Be.proposed,onConfirm:a=>{Cn(a)},onCancel:()=>{Le(null),I(void 0)}}),b.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:Mn,onDragOver:a=>{a.dataTransfer?.types?.includes("application/x-nxe-move")===!0&&(a.preventDefault(),a.dataTransfer.dropEffect="move",he.current!==a.currentTarget&&je(null,a.currentTarget))},onDragLeave:a=>{a.relatedTarget instanceof Node&&a.currentTarget.contains(a.relatedTarget)||he.current===a.currentTarget&&pe()},onDrop:a=>{let i=st(a);i!==""&&at({path:i,meta:{kind:ot.current}},o)}},Fn),b.default.createElement(dt,{text:te}),E===void 0?null:b.default.createElement("div",{className:"nano-toast nxe-git-alert",role:"alert","data-nxe-git-alert":"true"},b.default.createElement(P.IconWarningOutlineRegular,{width:14,height:14,className:"nxe-git-alert-icon","aria-hidden":"true"}),b.default.createElement("span",{className:"nxe-git-alert-text"},E),b.default.createElement("button",{type:"button",className:"nxe-git-alert-x",title:d.dismiss,"aria-label":d.dismiss,onClick:()=>m?.dismissGitError()},b.default.createElement(P.IconCloseOutlineRegular,{width:12,height:12,"aria-hidden":"true"}))),b.default.createElement(sn,{copy:d,git:g,stats:N,statsState:z,prefs:k,onOpenBranch:()=>Tt("branch"),onOpenCommit:()=>Tt("commit"),onRetryStats:()=>{ne()},onOpenSettings:()=>Xe(!0)}),Ln,b.default.createElement(rn,{copy:d,open:vn,prefs:k,onClose:()=>Xe(!1),setPref:(a,i)=>w.setPref(a,i)}),b.default.createElement(Vt,{copy:d,open:bt==="branch",git:g,busy:vt,error:yt,onClose:()=>{Ee(null),oe(void 0)},onPull:Rt,onCheckout:Dn,onRefresh:async()=>{await _()},onOpenConflict:a=>{we({path:re(o??"",a)}),Ee(null)}}),b.default.createElement(Xt,{copy:d,open:bt==="commit",git:g,busy:vt,error:yt,refreshing:yn,onClose:()=>{Ee(null),oe(void 0)},onCommit:Rn,onPull:Rt,onOpenConflict:a=>{we({path:re(o??"",a)}),Ee(null)}}),b.default.createElement(dn,{menu:L,copy:d,actions:An,onClose:()=>Ve(null)}))}function Ke({label:e,onClick:n,children:t,disabled:r}){return b.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:r===!0},t)}function da(e,n){let t=e.selected;if(t===null)return n;let r=X(n,t);return e.levels.has(r)?r:Oe(r)}function ca(e,n,t){return e.levels.get(X(n,t))?.entries??[]}var ua=P.IconPlusOutlineRegular,ha=P.IconFolderCloseRegular,pa=P.IconEditOutlineRegular,ma=P.IconRefreshOutlineRegular;function fa(){return b.default.createElement(ua,{width:16,height:16})}function ga(){return b.default.createElement(ha,{width:16,height:16})}function xa(){return b.default.createElement(ma,{width:16,height:16})}function wa(){return b.default.createElement(pa,{width:16,height:16})}function ba({copy:e,cwd:n,apps:t}){let r=Array.isArray(t)?t:[];if(n===""||r.length===0)return null;let[l,h]=b.default.useState(r[0]),[f,w]=b.default.useState(!1),y=b.default.useRef(null),p=r.includes(l)?l:r[0];b.default.useEffect(()=>{if(!f)return;let d=m=>{y.current!==null&&!y.current.contains(m.target)&&w(!1)},k=m=>{m.key==="Escape"&&w(!1)};return document.addEventListener("pointerdown",d,!0),document.addEventListener("keydown",k,!0),()=>{document.removeEventListener("pointerdown",d,!0),document.removeEventListener("keydown",k,!0)}},[f]);let o=d=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:d,path:n}),credentials:"same-origin"})};return b.default.createElement("span",{className:"nxe-reveal",ref:y,"data-nxe-reveal":p},b.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(Ye[p]??p),"aria-label":e.revealIn(Ye[p]??p),onClick:()=>{o(p)}},b.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(p)}`,alt:"",width:14,height:14})),b.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),b.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(f),onClick:()=>w(d=>!d)},b.default.createElement(P.IconChevronDownOutlineRegular,{width:10,height:10,"aria-hidden":"true"})),f?b.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},r.map(d=>b.default.createElement("button",{key:d,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{h(d),w(!1),o(d)}},b.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},b.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(d)}`,alt:"",width:14,height:14})),b.default.createElement("span",{className:"nano-menu-label"},Ye[d]??d)))):null)}var Ye={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var va={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0 Git \u72B6\u6001",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",dismiss:"\u5173\u95ED",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`\u4ED3\u5E93 \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitRefreshing:"\u6B63\u5728\u8BFB\u53D6\u6700\u65B0\u72B6\u6001",commitDrawerBody:(e,n)=>n?`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${n} \xB7 ${e} \u5904\u6539\u52A8`:`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${e} \u5904\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchConflictBlocks:"\u8FD9\u4E9B\u6587\u4EF6\u8FD8\u5728\u51B2\u7A81\u4E2D\u3002\u89E3\u51B3\u4E4B\u524D\uFF0C\u8FD9\u5F20\u5361\u7247\u91CC\u7684\u5207\u6362\u5206\u652F\u4E0D\u4F1A\u6267\u884C\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,checkoutTitle:e=>`\u5207\u6362\u5230 ${e}\uFF1F`,checkoutBody:e=>`\u5F53\u524D\u5DE5\u4F5C\u6811\u4F1A\u6539\u5230\u5206\u652F ${e}\u3002\u672A\u63D0\u4EA4\u7684\u66F4\u6539\u5982\u679C\u4F1A\u88AB\u8986\u76D6\uFF0C\u5207\u6362\u4F1A\u88AB\u62D2\u7EDD\u3002`,checkoutConfirm:"\u5207\u6362",worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u63D0\u4EA4\u56FE",localStaged:"\u5DF2\u6682\u5B58",localUnstaged:"\u672A\u6682\u5B58",localUntracked:"\u672A\u8DDF\u8E2A",localConflicts:"\u51B2\u7A81",filterChanges:"\u6309\u66F4\u6539\u7C7B\u578B\u7B5B\u9009",filterAll:"\u5168\u90E8",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Refresh Git status",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",dismiss:"Dismiss",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`Repository \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitRefreshing:"Reading latest status",commitDrawerBody:(e,n)=>n?`Working tree \xB7 ${n} \xB7 ${e} changes`:`Working tree \xB7 ${e} changes`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchConflictBlocks:"These files are still in conflict. Branch switches in this card do nothing until they are resolved.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,checkoutTitle:e=>`Switch to ${e}?`,checkoutBody:e=>`This worktree will move to ${e}. If local changes would be overwritten, the switch is refused.`,checkoutConfirm:"Switch",worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"History",localStaged:"Staged",localUnstaged:"Unstaged",localUntracked:"Untracked",localConflicts:"Conflicts",filterChanges:"Filter by change type",filterAll:"All",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function ya(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function De(e){return va[ya(e)]}function xn(e,n,t,r){let l={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&r!==void 0?e.statusBoth(l):t!==void 0?e.statusStaged(l):r!==void 0?e.statusUnstaged(l):l}var wn=`${ct}

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
`;var Re=J(A("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:Je,useCallback:Or,useEffect:Dr,useState:Rr}=wt.default,ka=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var Ea="files",xt="nano-explorer-extra",bn={handler:void 0};function Sa(){let e=tn(),n=new Set;return{get:()=>e,set:t=>{e=t,nn(e);for(let r of n)r()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function Na(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=wn,document.head.append(n),e.effect(()=>()=>n.remove());let t=Sa(),r=p=>e.sessions.list.getSnapshot().byId[p]?.cwd,l=p=>{bn.handler?.(p)},h=()=>e.locale.getSnapshot().active,f=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",w=()=>({copy:De(h()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:p=>t.subscribe(p),scheme:f,statusLabel:xn,onListed:()=>{},setRenameHandler:p=>{bn.handler=p},setPref:(p,o)=>t.set({...t.get(),[p]:o})});e.effect(()=>e.sidebarRightTabs.register({id:xt,kind:Ea,priority:"extension",keepMounted:!0,title:()=>De(h()).typeLabel,guide:[{id:"explorer",order:10,title:()=>De(h()).typeLabel,description:()=>De(h()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:xt,inject:()=>({nxe:w()})},gn)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:xt},function({useTabInfo:o}){let{tab:d}=o();return Je(wt.default.Fragment,null,Je(Re.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),d.title)})),"nano-explorer-extra: files tab title");let y=e.get("contextMenus");if(y!=null)for(let p of["file","directory"])e.effect(()=>y.register({id:`nano-explorer-extra.${p}`,target:p,order:900,resolve:async o=>{let d=De(h()),k=o.sessionId===void 0?void 0:r(o.sessionId),m=k===void 0?o.path:Q(k,o.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:d.copyRelative,failureLabel:d.copyFailed,run:()=>Ta(m)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:d.rename,failureLabel:d.renameFailed,run:()=>l?.({path:o.path,kind:p==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${p} menu`);e.slots.inject("contextMenu.icon",()=>{let p=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},Ca),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},$a)];return()=>{for(let o of p)o()}})}async function Ta(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function Ca(){return Je(Re.IconLinkOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}function $a(){return Je(Re.IconEditOutlineRegular,{width:16,height:16,"aria-hidden":"true"})}return qn(Oa);})();
		return __nxeExport;
	}
});
