window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var An=Object.create;var ze=Object.defineProperty;var zn=Object.getOwnPropertyDescriptor;var Un=Object.getOwnPropertyNames;var Hn=Object.getPrototypeOf,Gn=Object.prototype.hasOwnProperty;var F=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var jn=(e,n)=>{for(var t in n)ze(e,t,{get:n[t],enumerable:!0})},Tt=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let l of Un(n))!Gn.call(e,l)&&l!==t&&ze(e,l,{get:()=>n[l],enumerable:!(a=zn(n,l))||a.enumerable});return e};var q=(e,n,t)=>(t=e!=null?An(Hn(e)):{},Tt(n||!e||!e.__esModule?ze(t,"default",{value:e,enumerable:!0}):t,e)),Wn=e=>Tt(ze({},"__esModule",{value:!0}),e);var ka={};jn(ka,{DEFAULT_PREFS:()=>$e,apply:()=>wa,inject:()=>fa});var ht=q(F("react"),1);var w=q(F("react"),1);var J=q(F("react"),1),ot=F("@deepseek-ai/dsh-client-ui-primitives");var be=q(F("react"),1),De=F("@deepseek-ai/dsh-client-ui-primitives");function ue({copy:e,title:n,description:t,confirmLabel:a,confirmDisabled:l,busy:c,error:u,danger:g,footer:b,maxHeight:h,width:i,region:s,onConfirm:v,onCancel:x,children:E}){return be.default.createElement(De.Modal,{open:!0,onClose:x,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",h===void 0?"":"nano-dialog-capped",i===void 0?"":"nano-dialog-sized",s===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:b??be.default.createElement(be.default.Fragment,null,be.default.createElement(De.Button,{variant:"outline",className:"nano-modal-action",onClick:x},e.cancel),be.default.createElement(De.Button,{variant:g?"outline":"primary",className:g?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:l===!0||c===!0,onClick:v},a??e.confirm))},E,u===void 0?null:be.default.createElement("p",{className:"nano-dialog-error",role:"alert"},u))}var ve=q(F("react"),1),{useCallback:Na,useEffect:Ot,useRef:Bt,useState:Kn}=ve.default;function nt({menu:e,actions:n,onClose:t,width:a=208}){let l=Bt(null),[c,u]=Kn(0),g=e===null?[]:n,b=g.length,h=Bt(g);h.current=g;let i=e===null?null:e.openedAt;if(Ot(()=>{i!==null&&u(0)},[i]),Ot(()=>{if(e===null)return;let E=I=>{l.current!==null&&!l.current.contains(I.target)&&t()},A=I=>{if(I.key==="Escape"){I.stopPropagation(),t();return}if(I.key==="ArrowDown"){I.preventDefault(),u(H=>(H+1)%b);return}if(I.key==="ArrowUp"){I.preventDefault(),u(H=>(H-1+b)%b);return}I.key==="Enter"&&(I.preventDefault(),t(),h.current[c]?.run())};return document.addEventListener("pointerdown",E,!0),document.addEventListener("keydown",A,!0),()=>{document.removeEventListener("pointerdown",E,!0),document.removeEventListener("keydown",A,!0)}},[e,c,b,t]),e===null||b===0)return null;let s=b*28+8,v=Math.min(e.x,(window.innerWidth||a)-a-8),x=Math.min(e.y,(window.innerHeight||s)-s-8);return ve.default.createElement("div",{className:"nano-menu",role:"menu",ref:l,style:{position:"fixed",left:`${Math.max(8,v)}px`,top:`${Math.max(8,x)}px`,minWidth:`${a}px`},"data-nano-menu":"true"},g.map((E,A)=>ve.default.createElement(Dt,{key:E.id,item:E,index:A,active:A===c,onHover:u,onRun:t})))}function Dt({item:e,index:n,active:t,onHover:a,onRun:l}){return ve.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>a(n),onClick:()=>{l(),e.run()}},e.icon===void 0?null:ve.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),ve.default.createElement("span",{className:"nano-menu-label"},e.label))}var Rt=q(F("react"),1);function at({text:e}){return e==null?null:Rt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var rt=`
/* \u2500\u2500 anchored popup menu (NanoMenu, NanoMenuItem) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-menu { position: fixed; padding: 4px; display: flex; flex-direction: column; gap: 1px; z-index: 30;
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-3)); color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 12px);
  box-shadow: var(--dsw-elevation-prominent); backdrop-filter: var(--dsw-menu-backdrop-filter); }
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
  padding: 6px 12px; border-radius: var(--dsw-radius-sm, 8px); font-size: 12px;
  background: var(--dsw-alias-tooltip-bg, #43454a); color: var(--dsw-alias-tooltip-label, #f9fafb);
  box-shadow: var(--dsw-elevation-prominent); pointer-events: none; }
@keyframes nano-toast-in { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
.nano-toast { animation: nano-toast-in .12s ease; }

/* \u2500\u2500 shared dialog helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-dialog-host { position: fixed; inset: 0; z-index: 50; }
.nano-dialog-error { margin: 8px 0 0; font-size: 12px; color: var(--dsw-alias-danger, #cf222e); }
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
`;var{useState:It}=J.default;function Ue(e){return He(),J.default.createElement(ue,e)}function He(){J.default.useEffect(()=>{let e=!0,n=()=>{if(!e)return;let a=document.querySelector("[data-nxe]")?.closest("[data-sidebar-right-pane]")??document.querySelector("[data-nxe]");if(!(a instanceof HTMLElement))return;let l=a.getBoundingClientRect();if(!(l.width<1||l.height<1))for(let c of document.querySelectorAll(".nano-dialog-card")){if(c.querySelector('[class*="nxe-"]')===null)continue;let u=c.parentElement;if(u instanceof HTMLElement&&(u.classList.add("nxe-confined-layer"),Object.assign(u.style,{position:"fixed",top:`${l.top}px`,left:`${l.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${l.width}px`,height:`${l.height}px`,padding:"12px"}),c.querySelector(".nxe-scm")!==null)){c.dataset.nxeFill="1";let g=a.getAttribute("data-theme");g&&c.setAttribute("data-theme",g),u.style.display="flex",u.style.flexDirection="column",u.style.justifyContent="flex-end";let h=c.querySelector("[data-nxe-scm]")?.getAttribute("data-nxe-scm")==="commit"?.46:.68;Object.assign(c.style,{width:"100%",maxWidth:"100%",height:"auto",maxHeight:`${Math.max(260,Math.round((l.height-24)*h))}px`,minHeight:"0",minWidth:"0",margin:"0"})}}},t=new MutationObserver(n);return t.observe(document.body,{childList:!0}),window.addEventListener("resize",n),n(),()=>{e=!1,t.disconnect(),window.removeEventListener("resize",n);for(let a of document.querySelectorAll(".nxe-confined-layer")){a.classList.remove("nxe-confined-layer");for(let l of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction"])a.style.removeProperty(l)}for(let a of document.querySelectorAll("[data-nxe-fill]"))if(a instanceof HTMLElement){delete a.dataset.nxeFill;for(let l of["width","max-width","height","max-height","min-height","min-width","margin"])a.style.removeProperty(l)}}},[])}function Mt({children:e}){return J.default.createElement("div",{className:"nxe-dialog-field"},e)}function Ft({copy:e,files:n,busy:t,error:a,onConfirm:l,onCancel:c}){let[u,g]=It(""),b=u.trim()==="";return J.default.createElement(Ue,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:b,busy:t,error:a,onConfirm:()=>l(u),onCancel:c,description:e.commitBody(n.length)},J.default.createElement(Mt,null,J.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(h=>J.default.createElement("li",{key:h.path,title:h.path},`${h.status} ${h.path}`))),J.default.createElement(ot.Input,{value:u,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:h=>g(h.currentTarget.value)})))}function it({copy:e,currentName:n,busy:t,error:a,onConfirm:l,onCancel:c,mode:u="rename"}){let[g,b]=It(n),h=g.trim()==="",i=u==="create";return J.default.createElement(Ue,{copy:e,title:i?e.newEntryTitle:e.renameTitle,confirmLabel:i?e.create:e.confirm,busy:t,error:a,confirmDisabled:h,onConfirm:()=>l(g),onCancel:c,description:i?e.newEntryBody(n):e.renameBody(n)},J.default.createElement(Mt,null,J.default.createElement(ot.Input,{value:g,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:s=>b(s.currentTarget.value),onKeyDown:s=>{s.key==="Enter"&&!h&&(s.preventDefault(),l(g))}})))}var d=q(F("react"),1),he=F("@deepseek-ai/dsh-client-ui-primitives");function Re(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,a=0;for(;t>=1024&&a<n.length-1;)t/=1024,a+=1;return`${a===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[a]}`}function Lt(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function Pt(e){let n=[],t=[],a=[],l=[];for(let c of e??[]){if(c?.status==="U"){l.push(c);continue}if(c?.status==="?"){a.push(c);continue}c?.staged&&n.push({...c,status:c.staged}),c?.unstaged?t.push({...c,status:c.unstaged}):c?.staged||t.push(c)}return{staged:n,unstaged:t,untracked:a,conflicts:l}}function At(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function st(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function zt(e,n,t){let a=new Map(e),l=n===""?"":`${n}/`;for(let c of a.keys())(l===""||c===n||c.startsWith(l))&&a.delete(c);for(let c of t)typeof c?.path=="string"&&c.path!==""&&a.set(c.path,c);return a}function Ut(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let a=Math.floor(t/60);if(a<24)return{unit:"hours",value:a};let l=Math.floor(a/24);if(l<30)return{unit:"days",value:l};let c=new Date(e*1e3),u=g=>String(g).padStart(2,"0");return{unit:"date",value:`${c.getFullYear()}-${u(c.getMonth()+1)}-${u(c.getDate())}`}}var{useEffect:Gt,useState:dt}=d.default;function _n(e,n){let t=Ut(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function jt(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function Ht(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(a=>String(a??"").toLowerCase().includes(t))}function qn({file:e}){let{name:n,dir:t}=At(e.path);return d.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},d.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),d.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:d.default.createElement("span",{className:"nxe-change-dir"},t)))}function lt({label:e,count:n,files:t,tone:a}){return t.length===0?null:d.default.createElement("section",{className:"nxe-scm-group","data-tone":a??"default"},d.default.createElement("h3",{className:"nxe-local-head","data-tone":a??"default"},d.default.createElement("span",null,e),d.default.createElement("span",{className:"nxe-local-badge"},String(n))),d.default.createElement("ul",{className:"nxe-drawer-list"},t.slice(0,400).map(l=>d.default.createElement(qn,{key:`${a??""}:${l.path}`,file:l}))))}function Yn({copy:e,history:n,currentBranch:t}){let a=n??[];return d.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},d.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),a.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):d.default.createElement("ol",{className:"nxe-graph"},a.map((l,c)=>d.default.createElement("li",{key:`${l.hash}:${c}`,className:"nxe-graph-row","data-head":String(c===0),title:[l.hash,_n(e,l.time),l.subject].filter(u=>u!=="").join(" \xB7 ")},d.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},d.default.createElement("span",{className:"nxe-graph-dot"})),d.default.createElement("span",{className:"nxe-graph-subject"},d.default.createElement("span",{className:"nxe-graph-hash"},l.hash)," ",l.subject),d.default.createElement("span",{className:"nxe-graph-pills"},l.refs.slice(0,2).map(u=>d.default.createElement("span",{key:u,className:"nxe-pill","data-tone":u===t?"current":"default",title:u},u)))))))}function Wt({copy:e,open:n,git:t,onClose:a,onPull:l,onRefresh:c,onCheckout:u,onOpenConflict:g,busy:b,error:h}){He();let[i,s]=dt("");if(Gt(()=>{n||s("")},[n]),!n)return null;let v=jt(t),x=t?.upstream??null,E=t?.behind??0,A=t?.ahead??0,I=t?.history??[],H=[...t?.branches??[]].sort((f,K)=>f.current===!0&&K.current!==!0?-1:K.current===!0&&f.current!==!0?1:f.name.localeCompare(K.name)).filter(f=>Ht(i,[f.name,f.upstream,f.commit])),X=(t?.worktrees??[]).filter(f=>Ht(i,[f.branch,f.path,f.head,st(f.path)])),y=i.trim()!==""&&H.length===0&&X.length===0,G=t?.conflicts??[],re=e.branchDrawerSummary(v??e.detached,x===null?e.noUpstream:`${x} \xB7 ${e.factSyncValue(E,A)}`,e.worktreesHeadingCount((t?.worktrees??[]).length));return d.default.createElement(ue,{copy:e,title:e.branchDrawerTitle,description:G.length===0?re:`${re} \xB7 ${e.factConflicted(G.length)}`,error:h,footer:d.default.createElement(d.default.Fragment,null,d.default.createElement(he.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{c()}},e.refreshGit),x===null?null:d.default.createElement(he.Button,{variant:"primary",className:"nano-modal-action",disabled:b===!0||E===0,title:E===0?e.pullNothing:e.pullNow,onClick:()=>{l()}},E>0?`${e.pullNow} ${E}`:e.pullNow)),onCancel:a},d.default.createElement("div",{className:"nxe-scm nxe-repo","data-nxe-scm":"branch"},G.length===0?null:d.default.createElement("section",{className:"nxe-repo-conflict","data-nxe-conflicts":String(G.length)},d.default.createElement("p",{className:"nxe-repo-conflict-title"},d.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!")," ",e.factConflicted(G.length)),d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchConflictBlocks),d.default.createElement("ul",{className:"nxe-drawer-list nxe-repo-conflict-list"},G.map(f=>d.default.createElement("li",{key:f,className:"nxe-change","data-status":"U"},d.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),d.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:f,onClick:()=>g?.(f)},f))))),d.default.createElement(Yn,{copy:e,history:I,currentBranch:v}),d.default.createElement(he.Input,{value:i,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:f=>s(f.currentTarget.value)}),y?d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):d.default.createElement(d.default.Fragment,null,d.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(H.length)),H.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):d.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},H.map(f=>d.default.createElement("li",{key:f.name,className:"nxe-drawer-row","data-current":String(f.current===!0),"data-blocked":String(f.inOtherWorktree===!0)},d.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:f.current===!0||f.inOtherWorktree===!0||b===!0||G.length>0,title:G.length>0?e.branchConflictBlocks:f.inOtherWorktree===!0?e.branchHeldElsewhere:f.name,onClick:()=>{u(f.name)},"data-nxe-checkout":f.name},f.name),f.commit===""?null:d.default.createElement("span",{className:"nxe-graph-hash"},f.commit),f.upstream===null?null:d.default.createElement("span",{className:"nxe-drawer-row-path",title:f.upstream},f.upstream),G.length>0&&f.current===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"danger"},"!"):null,f.inOtherWorktree===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):f.current===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),d.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(X.length)),X.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):d.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},X.map(f=>{let K=f.path===t?.root,Q=f.detached?e.detached:f.branch??e.detached,xe=typeof f.head=="string"?f.head.slice(0,7):"";return d.default.createElement("li",{key:f.path,className:"nxe-worktree","data-current":String(K),title:f.path},d.default.createElement("span",{className:"nxe-worktree-mark","data-current":String(K),"aria-hidden":"true"}),d.default.createElement("span",{className:"nxe-worktree-body"},d.default.createElement("span",{className:"nxe-worktree-line"},d.default.createElement("span",{className:"nxe-worktree-branch"},Q),xe===""?null:d.default.createElement("span",{className:"nxe-graph-hash"},xe),K?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),d.default.createElement("span",{className:"nxe-worktree-path"},st(f.path))))})))))}function Kt({copy:e,open:n,git:t,onClose:a,onCommit:l,busy:c,error:u,onOpenConflict:g}){He();let[b,h]=dt(""),[i,s]=dt("all");if(Gt(()=>{n||s("all")},[n]),!n)return null;let v=t?.files??[],x=Pt(v),E=x.conflicts.length>0?x.conflicts:(t?.conflicts??[]).map(y=>({path:y,status:"U"})),A=v.length,I=jt(t),H=A>0&&E.length===0&&b.trim()!==""&&c!==!0,X=()=>{H&&Promise.resolve(l(b)).then(y=>{y===!0&&h("")})};return d.default.createElement(ue,{copy:e,title:e.commitDrawerTitle,description:e.commitDrawerBody(A,I??(t?.detached?e.detached:null)),error:u,footer:d.default.createElement(he.Button,{variant:"primary",className:"nano-modal-action",disabled:!H,onClick:X},e.commit),onCancel:a},d.default.createElement("div",{className:"nxe-scm nxe-local","data-nxe-scm":"commit"},d.default.createElement(he.Input,{value:b,placeholder:I===null?e.commitPlaceholder:e.commitPlaceholderOn(I),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:y=>h(y.currentTarget.value),onKeyDown:y=>{y.key==="Enter"&&(y.metaKey||y.ctrlKey)&&(y.preventDefault(),X())}}),d.default.createElement("div",{className:"nxe-local-filters",role:"group","aria-label":e.filterChanges},[{id:"all",label:e.filterAll,count:A},{id:"staged",label:e.localStaged,count:x.staged.length},{id:"unstaged",label:e.localUnstaged,count:x.unstaged.length},{id:"untracked",label:e.localUntracked,count:x.untracked.length},...E.length===0?[]:[{id:"conflict",label:e.localConflicts,count:E.length}]].map(y=>d.default.createElement(he.Button,{key:y.id,variant:i===y.id?"primary":"outline",className:"nxe-local-filter",disabled:y.id!=="all"&&y.count===0,"aria-pressed":String(i===y.id),onClick:()=>s(y.id)},`${y.label} ${y.count}`))),i!=="all"&&i!=="conflict"||E.length===0?null:d.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},d.default.createElement("h3",{className:"nxe-local-head","data-tone":"danger"},d.default.createElement("span",null,e.localConflicts),d.default.createElement("span",{className:"nxe-local-badge"},String(E.length))),d.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),d.default.createElement("ul",{className:"nxe-drawer-list"},E.map(y=>d.default.createElement("li",{key:y.path,className:"nxe-change","data-status":"U"},d.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),d.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:y.path,onClick:()=>g(y.path)},y.path))))),A===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):d.default.createElement(d.default.Fragment,null,i==="all"||i==="staged"?d.default.createElement(lt,{label:e.localStaged,count:x.staged.length,files:x.staged,tone:"staged"}):null,i==="all"||i==="unstaged"?d.default.createElement(lt,{label:e.localUnstaged,count:x.unstaged.length,files:x.unstaged,tone:"unstaged"}):null,i==="all"||i==="untracked"?d.default.createElement(lt,{label:e.localUntracked,count:x.untracked.length,files:x.untracked,tone:"untracked"}):null)))}var z=q(F("react"),1),Xt=F("@deepseek-ai/dsh-client-ui-primitives");var qt="dsh-nano-explorer-extra:prefs.v2",Jn="dsh-nano-explorer-extra:prefs.v1",$e={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function Yt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _t(e){let n=Yt(e)?e:{},t={};for(let[a,l]of Object.entries($e))t[a]=typeof n[a]=="boolean"?n[a]:l;return t}function Jt(){try{let e=window.localStorage?.getItem(qt);if(e!=null)return _t(JSON.parse(e));let n=window.localStorage?.getItem(Jn);if(n==null)return{...$e};let t=JSON.parse(n),a=Yt(t)?{...t}:{};return delete a.openPreviewOnClick,delete a.openPreviewOnDoubleClick,_t(a)}catch{return{...$e}}}function Vt(e){try{window.localStorage?.setItem(qt,JSON.stringify(e))}catch{}}function pe({label:e,hint:n,checked:t,onChange:a,warn:l}){return z.default.createElement("div",{className:"nxe-settings-row"},z.default.createElement("div",null,z.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:z.default.createElement("div",{className:"nxe-settings-hint"},n),l===!0?z.default.createElement("p",{className:"nxe-warn"},n):null),z.default.createElement(Xt.Switch,{checked:t,label:e,onChange:a}))}function Qt({copy:e,open:n,prefs:t,setPref:a,onClose:l}){if(!n)return null;let c=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return z.default.createElement(ue,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:l},z.default.createElement(pe,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:u=>a("openPreviewOnClick",u)}),z.default.createElement(pe,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:u=>a("openPreviewOnDoubleClick",u)}),c?z.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,z.default.createElement(pe,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:u=>a("showOpenButton",u)}),z.default.createElement(pe,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:u=>a("showIgnoredBadge",u)}),z.default.createElement(pe,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:u=>a("showGitStatus",u)}),z.default.createElement(pe,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:u=>a("showSystemFiles",u)}),z.default.createElement(pe,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:u=>a("showStatusBar",u)}),z.default.createElement(pe,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:u=>a("statsExcludeGit",u)}))}var j=q(F("react"),1);function Zt(e){return function({entry:t}){let a=e.copy(),l=e.statusOf(t.path),c=e.ignoredOf(t.path),u=e.linkOf(t.path),g=e.linkBrokenOf(t.path)===!0,b=t.meta?.kind!=="directory",h=b?void 0:e.folderStatusOf(t.path),i=e.showGit()&&!c,s=i?e.stagedOf(t.path):void 0,v=i?e.unstagedOf(t.path):void 0,x=i?e.remoteOf(t.path):void 0;return j.default.createElement("span",{className:"nxe-acc",...c?{"data-nxe-ignored":"true"}:{}},u===void 0?null:j.default.createElement("span",{className:"nxe-acc-link",title:g?a.linkBroken:u?a.symlinkOutsideBadge:a.symlinkBadge,"aria-label":g?a.linkBroken:u?a.symlinkOutsideBadge:a.symlinkBadge,"data-nxe-symlink":g?"broken":u?"outside":"inside"},j.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round","aria-hidden":"true"},j.default.createElement("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),j.default.createElement("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}),g?j.default.createElement("path",{d:"M3 3l18 18"}):null)),x===void 0?null:j.default.createElement("span",{className:"nxe-acc-remote","data-status":x.status,"data-direction":x.direction,title:x.direction==="pulled"?a.remotePulled(x.status):a.remotePushed(x.status),"aria-label":x.direction==="pulled"?a.remotePulled(x.status):a.remotePushed(x.status)},`${x.direction==="pulled"?"\u2193":"\u2191"}${x.status}`),i&&l!==void 0?j.default.createElement("span",{className:"nxe-acc-letter","data-status":l,"data-staged":s===void 0?"false":"true",title:e.statusLabel(l,s,v),"aria-label":e.statusLabel(l,s,v)},l):null,i&&h!==void 0?j.default.createElement("span",{className:"nxe-acc-dot","data-status":h,title:e.statusLabel(h),"aria-label":e.statusLabel(h)}):null,c?j.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:a.ignoredBadge,"aria-label":a.ignoredBadge},"\u2298"):null,b&&e.showOpenButton()?j.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:a.openFile,"aria-label":`${a.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:E=>{E.stopPropagation(),e.open(t)}},j.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},j.default.createElement("path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}),j.default.createElement("path",{d:"M15 3h6v6"}),j.default.createElement("path",{d:"M10 14 21 3"}))):null)}}var $=q(F("react"),1);var W=F("@deepseek-ai/dsh-client-ui-primitives");function ct({icon:e,value:n,title:t,scope:a}){return $.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":a},e,$.default.createElement("span",{className:"nxe-figure-value"},n))}function en(e){let{copy:n,git:t,stats:a,statsState:l,prefs:c,onOpenBranch:u,onOpenCommit:g}=e;if(!c.showStatusBar)return null;let b=[];if(t==null)b.push($.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},$.default.createElement(W.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),$.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let i=t.detached?n.detached:t.branch??n.detached,s=t.files?.length??0,v=t.conflicts?.length??0,x=s>0;b.push($.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(x),"data-conflicted":String(v>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(i,x,v),"aria-label":n.branchButtonTooltip(i,x,v),onClick:u},$.default.createElement(W.IconBranchOutlineRegular,{width:14,height:14}),$.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},i),x?$.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,v>0?$.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&b.push($.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},$.default.createElement(W.IconArchiveOutlineRegular,{width:14,height:14}),$.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let E=t.upstream===null||t.upstream===void 0?void 0:Lt(t.ahead??0,t.behind??0);b.push($.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(s),title:n.commitButtonTooltip(s,E===void 0?null:E),"aria-label":n.commitButtonTooltip(s,E===void 0?null:E),onClick:g},$.default.createElement(W.IconRefreshOutlineRegular,{width:14,height:14}),$.default.createElement("span",{className:"nxe-chip-count","data-nxe-pending":String(s)},String(s)),E===void 0?null:$.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},E)))}let h=[];if(l==="loading")h.push($.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(l==="failed")h.push($.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(a!=null){let i=a.truncated?"+":"",s=c.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";h.push($.default.createElement(ct,{key:"dirs",scope:"directories",icon:$.default.createElement(W.IconFolderCloseRegular,{width:14,height:14}),value:`${a.directories}${i}`,title:n.statsTooltip(a.files,a.directories,Re(a.bytes))+s})),h.push($.default.createElement(ct,{key:"files",scope:"files",icon:$.default.createElement(W.IconDeliverDocRegular,{width:14,height:14}),value:`${a.files}${i}`,title:n.statsTooltip(a.files,a.directories,Re(a.bytes))+s})),h.push($.default.createElement(ct,{key:"bytes",scope:"bytes",icon:$.default.createElement(W.IconGaugeOutlineRegular,{width:14,height:14}),value:Re(a.bytes),title:n.statsSizeTooltip(Re(a.bytes))+s}))}return h.push($.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},$.default.createElement(W.IconSettingsOutlineRegular,{width:14,height:14}))),$.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},$.default.createElement("div",{className:"nxe-status-left"},b),$.default.createElement("div",{className:"nxe-status-right"},h))}var tn=q(F("react"),1);function nn({menu:e,actions:n,onClose:t}){return tn.default.createElement(nt,{menu:e,actions:n,onClose:t})}var U=q(F("@deepseek-ai/dsh-client-ui-primitives"),1);var on=q(F("react"),1);function ie(e,n){let t=oe(e),a=String(n??"").replace(/\\/gu,"/");return a===""?t:a.startsWith("/")||/^[A-Za-z]:\//u.test(a)?oe(a):`${t==="/"?"":t}/${a}`.replace(/\/{2,}/gu,"/")}function V(e,n){return oe(ie(e,n))}function Vn(e,n){let t=oe(e),a=oe(n);return t===a?!0:a.startsWith(t==="/"?"/":`${t}/`)}function ae(e,n){let t=oe(e),a=oe(n);return a===t?"":Vn(t,a)?a.slice(t==="/"?1:t.length+1):a}function Ge(e){let n=oe(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Ie(e){let n=oe(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function oe(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:ye,useEffect:an,useMemo:rn,useRef:Me,useState:Fe}=on.default;function sn(e){let{sessionId:n,root:t,request:a,prefs:l,onListed:c}=e,[u,g]=Fe(()=>new Map),[b,h]=Fe(()=>new Set),i=Me(b);i.current=b;let[s,v]=Fe(null),[x,E]=Fe(null),[A,I]=Fe(0),H=Me(!0),X=Me(c);X.current=c,an(()=>()=>{H.current=!1},[]);let y=ye(async(N,O=!1)=>{let C=V(t,N);O||g(R=>{let T=new Map(R);return T.get(C)===void 0&&T.set(C,{loading:!0,entries:[]}),T});let S=await a("/list",{sessionId:n,path:N});if(H.current)return g(R=>{let T=new Map(R),se=T.get(C);return S.ok?T.set(C,{entries:S.entries,truncated:S.truncated===!0,outside:S.outside===!0,failed:se?.failed===!0&&se.entries?.length>0?se.failed:!1}):T.set(C,{entries:se?.entries??[],failed:!0,message:S.message,code:S.code}),T}),X.current?.(N,S.ok?S.entries.map(R=>R.name):[]),S},[t,n,a]),G=Me(void 0),re=Me([]);an(()=>{if(t!==void 0){if(G.current!==t){G.current=t,g(new Map),h(new Set),y(t);return}y(t,!0);for(let N of re.current)y(N,!0)}},[t,A,y]);let f=ye(async()=>{re.current=[...i.current],I(N=>N+1)},[]),K=ye(N=>y(N,!0),[y]),Q=ye((N,O)=>{let C=V(t,N);h(S=>{let R=new Set(S);return O?R.add(C):R.delete(C),R}),O&&u.get(C)===void 0&&y(N)},[t,u,y]),xe=ye(N=>{let O=V(t,N);g(C=>{if(C.has(O))return C;let S=new Map(C);return S.set(O,{entries:[]}),S})},[t]),Z=ye(N=>{let O=V(t,N);g(C=>{if(!C.has(O))return C;let S=new Map(C);return S.delete(O),S})},[t]),Pe=ye(N=>{let O=V(t,N);h(C=>{let S=new Set;for(let R of C)R!==O&&!R.startsWith(`${O}/`)&&S.add(R);return S}),g(C=>{let S=new Map;for(let[R,T]of C)R!==O&&!R.startsWith(`${O}/`)&&S.set(R,T);return S})},[t]),_=rn(()=>{let N=[];for(let[O,C]of u)for(let S of C.entries??[]){let R=O===""?S.name:`${O}/${S.name}`;N.push({...S,path:R})}return N},[u]),Ke=rn(()=>{let N={};for(let[O,C]of u)C.loading===!0&&(C.entries?.length??0)===0?N[O]={loading:!0}:C.failed===!0?N[O]={failure:C.message}:C.truncated===!0&&(N[O]={truncated:!0});return N},[u]);return{levels:u,entries:_,directories:Ke,expanded:[...b],selected:s,setSelected:v,toggle:Q,pending:x,setPending:E,refresh:f,refreshLevel:K,loadLevel:y,forget:Z,collapseUnder:Pe,knownEmpty:xe}}var Xn=".md";function ln(e,n){let t=e==="file"?"untitled":"new-folder",a=new Set((n??[]).map(c=>String(c.name??"").toLowerCase())),l=c=>e==="file"?`${t}${c===1?"":`-${c}`}${Xn}`:`${t}${c===1?"":`-${c}`}`;for(let c=1;c<1e4;c+=1){let u=l(c);if(!a.has(u.toLowerCase()))return u}throw new Error("cannot find an unused name")}function dn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:B,useEffect:Le,useMemo:me,useRef:fe,useState:L,useSyncExternalStore:Qn}=w.default,Zn=400,ea=["U","D","M","A","R","?"],ta=new Set([".git",".DS_Store"]);function cn(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function un(e){let{useTabInfo:n,sessionId:t,useSessions:a,renderSlot:l,renderFactorySlot:c,useContextMenu:u,nxe:g}=e,{tab:b,panel:h}=n(),i=a(r=>r.byId[t]?.cwd),s=g.copy,v=Qn(g.subscribePrefs,g.getPrefs,g.getPrefs),[x,E]=L(null),[A,I]=L(void 0),[H,X]=L(null),[y,G]=L("idle"),[re,f]=L(null),[K,Q]=L(!1),[xe,Z]=L(void 0),[Pe,_]=L(void 0),[Ke,N]=L(void 0),[O,C]=L([]);Le(()=>{let r=!0;return(async()=>{try{let o=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!o.ok)return;let p=await o.json(),k=Array.isArray(p.apps)?p.apps:[];r&&C(k.filter(M=>typeof M=="string"))}catch{}})(),()=>{r=!1}},[]);let[S,R]=L(null),[T,se]=L(null),[Ae,_e]=L(null),[pt,ke]=L(null),[gn,mt]=L(!1),[ft,Ee]=L(!1),[gt,le]=L(void 0),Oe=fe(0),[qe,Ye]=L(()=>new Map),xt=fe({path:"",at:0}),Se=fe(v);Se.current=v;let D=B(async(r,o)=>{try{let p=await fetch(`/nano-explorer-extra${r}`,{method:o===void 0?"GET":"POST",headers:o===void 0?void 0:{"content-type":"application/json"},body:o===void 0?void 0:JSON.stringify(o),credentials:"same-origin",cache:"no-store"}),k=await p.json().catch(()=>({error:`HTTP ${p.status}`}));return p.ok?{ok:!0,...k}:{ok:!1,message:k?.error??`HTTP ${p.status}`}}catch(p){return{ok:!1,message:p instanceof Error?p.message:String(p)}}},[]),xn=B(async(r,o)=>{if(!Se.current.showGitStatus||!Array.isArray(o)||o.length===0)return;let p=await D("/ignored",{sessionId:t,paths:o});!p.ok||!Array.isArray(p.ignored)||p.ignored.length===0||bn(k=>{let M=new Set(k),P=ae(i??"",r);for(let ne of p.ignored)M.add(P===""?ne:`${P}/${ne}`);return M})},[D,t,i]),m=sn({sessionId:t,root:i,request:D,prefs:v,onListed:(r,o)=>{xn(r,o)}}),Be=fe(0),wt=fe(null);wt.current=m;let bt=fe(async()=>{}),ee=B(async()=>{if(i===void 0)return;if(!Se.current.showGitStatus){E(null),I(void 0),Ye(new Map);return}let r=Be.current+1;Be.current=r;let o=await D(`/status?sessionId=${encodeURIComponent(t)}`);if(r===Be.current){if(!o.ok){I(o.message);return}E(o.git??null),I(o.gitError),Ye(new Map);for(let p of wt.current?.expanded??[])bt.current(p)}},[i,t,D]),Y=B(async()=>{if(i===void 0)return;G("loading");let r=await D(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!r.ok){G("failed");return}X(r.stats??null),G("ok")},[i,t,D]);Le(()=>{ee()},[ee]),Le(()=>{Y()},[i]);let Je=fe(0),Ne=B(()=>{window.clearTimeout(Je.current),Je.current=window.setTimeout(()=>{Y()},2e3)},[Y]);Le(()=>()=>{window.clearTimeout(Je.current),window.clearTimeout(Oe.current)},[]);let wn=me(()=>{let r=new Map;for(let o of m.entries)o.symlink===!0&&r.set(o.path,{outside:o.outside===!0});return r},[m.entries]),Ve=me(()=>Array.isArray(x?.files)?x.files:[],[x]),Xe=me(()=>{let r=new Map;for(let o of Ve)r.set(o.path,o);return r},[Ve]),[Qe,bn]=L(()=>new Set),Ce=x?.root,vt=fe(Ce);vt.current=Ce;let de=me(()=>{if(qe.size===0)return Xe;let r=new Map(Xe);for(let[o,p]of qe)r.set(o,p);return r},[Xe,qe]),te=B(r=>{if(Ce==null)return;let o=ie(i??"",r);return ae(Ce,o)},[Ce,i]),Ze=B(r=>{let o=te(r);if(o===void 0)return!1;if(Qe.has(o))return!0;let p=o.split("/");for(let k=p.length-1;k>0;k-=1)if(Qe.has(p.slice(0,k).join("/")))return!0;return!1},[Qe,te]),yt=B(r=>{let o=te(r);if(o!==void 0)return de.get(o)?.status},[de,te]),vn=B(r=>{let o=te(r);if(o!==void 0)return de.get(o)?.staged},[de,te]),yn=B(r=>{let o=te(r);if(o!==void 0)return de.get(o)?.unstaged},[de,te]),kt=me(()=>{let r=new Map;for(let o of x?.remote?.pushed??[])r.set(o.path,{status:o.status,direction:"pushed"});for(let o of x?.remote?.pulled??[])r.set(o.path,{status:o.status,direction:"pulled"});return r},[x]),kn=B(r=>{let o=te(r);if(o!==void 0)return kt.get(o)},[kt,te]),we=B(r=>{let o=ie(i??"",r.path),p=i??"",k=ae(p,o),P=p!==""&&k!==o?`dsh-resource://file/session/${encodeURIComponent(t)}/${cn(k)}`:`dsh-resource://file/absolute/${cn(o.replace(/^\/+/,""))}`;h.isFloating?b.actions.openResource(P):b.actions.openResource(P,{paneId:h.id})},[i,t,b.actions,h.id,h.isFloating]),et=B(async r=>{if(i===void 0||!Se.current.showGitStatus)return;let o=Be.current,p=await D(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(r)}`);if(o!==Be.current||!p.ok||p.git===null||p.git===void 0)return;let k=p.git.root,M=vt.current??i,P=ae(M,r);if(P===r&&P!=="")return;let ne=[];for(let ce of p.git.files??[]){let Ct=k===void 0?ce.path:`${k.replace(/\/+$/u,"")}/${ce.path}`,$t=ae(M,Ct);$t!==Ct&&ne.push({...ce,path:$t})}Ye(ce=>zt(ce,P,ne))},[i,t,D]);bt.current=et;let En=B(async r=>{let o=await m.loadLevel(r.path);m.toggle(r.path,!0),o?.ok&&et(r.path)},[m,et]),Sn=B(async r=>{Q(!0);let o=await D("/delete",{sessionId:t,path:r.path,kind:r.kind==="directory"?"directory":"file"});if(Q(!1),!o.ok){_(o.message);return}_e(null),_(void 0),m.forget(r.path),m.collapseUnder(r.path);let p=Ge(r.path);p!==r.path&&await m.refreshLevel(p),m.selected===r.path&&m.setSelected(null),Ne()},[t,D,m,Ne]),Et=B(r=>{if(i===void 0)return;let o=na(m,i),p=aa(m,i,o);_(void 0),R({kind:r,directory:o,proposed:ln(r,p)})},[i,m]),Nn=B(async r=>{if(S===null)return;let{kind:o,directory:p}=S,k=dn(r,s);if(!k.ok){_(k.message);return}Q(!0);let M=await D(o==="file"?"/create-file":"/create-folder",{sessionId:t,directory:p,name:k.name});if(Q(!1),!M.ok){_(M.message);return}R(null),_(void 0),await m.refreshLevel(p);let P=ae(i??"",p),ne=ie(i??"",`${P===""?"":`${P}/`}${k.name}`);m.setSelected(ne),o==="folder"&&(m.knownEmpty(ne),m.toggle(ne,!0)),Ne()},[S,s,i,t,D,m,Ne]),Cn=B(async(r,o)=>{if(i===void 0)return;let p=ie(i,r.path),k=r.meta?.kind==="directory"?"directory":"file";Q(!0),Z(void 0);let M=await D("/rename",{sessionId:t,path:p,name:o,kind:k});if(Q(!1),!M.ok){Z(M.message);return}f(null);let P=Ge(p);await m.refreshLevel(P),k==="directory"&&m.collapseUnder(p),m.setSelected(ie(i,`${ae(i,P)===""?"":`${ae(i,P)}/`}${o.trim()}`)),Ne()},[i,t,D,m,Ne]),$n=B(async r=>{Q(!0),Z(void 0);let o=await D("/commit",{sessionId:t,message:r});if(Q(!1),!o.ok){Z(o.message);return}f(null),await m.refresh(),await ee(),await Y()},[t,D,m,ee,Y]),St=B(async()=>{Ee(!0),le(void 0);let r=await D("/pull",{sessionId:t});if(Ee(!1),!r.ok){le(r.message);return}await m.refresh(),await ee(),await Y()},[t,D,m,ee,Y]),Tn=B(async r=>{Ee(!0),le(void 0);let o=await D("/checkout",{sessionId:t,branch:r});if(Ee(!1),!o.ok){le(o.message);return}N(s.branchSwitched(r)),window.clearTimeout(Oe.current),Oe.current=window.setTimeout(()=>N(void 0),2e3),await m.refresh(),await ee(),await Y()},[t,D,m,ee,Y,s]),On=B(async r=>{Ee(!0),le(void 0);let o=await D("/commit",{sessionId:t,message:r});return Ee(!1),o.ok?(await m.refresh(),await ee(),await Y(),!0):(le(o.message),!1)},[t,D,m,ee,Y]),tt=B(async(r,o)=>{try{await navigator.clipboard.writeText(o||r),N(s.copied),window.clearTimeout(Oe.current),Oe.current=window.setTimeout(()=>N(void 0),1600)}catch(p){_(p instanceof Error?p.message:String(p))}},[s.copied]),Bn=B((r,o)=>({onContextMenu:p=>{p.preventDefault(),p.stopPropagation(),m.setSelected(r.path),se({x:p.clientX,y:p.clientY,path:r.path,name:r.name,kind:o,openedAt:Date.now()})}}),[m]),Dn=B(r=>{let o=te(r);if(o===void 0)return;let p=o===""?"":`${o}/`,k,M=-1;for(let[P,ne]of de){if(p!==""&&!P.startsWith(p))continue;let ce=ea.indexOf(ne.status);ce>M&&(M=ce,k=ne.status)}return k},[de,te]),Nt=me(()=>Zt({copy:()=>s,statusOf:yt,stagedOf:vn,unstagedOf:yn,remoteOf:kn,ignoredOf:Ze,folderStatusOf:Dn,linkBrokenOf:r=>m.levels.get(V(i??"",r))?.code==="broken-link",linkOf:r=>{let o=wn.get(r);if(o!==void 0)return o.outside===!0},showGit:()=>v.showGitStatus,showIgnoredBadge:()=>v.showIgnoredBadge,showOpenButton:()=>v.showOpenButton,statusLabel:r=>g.statusLabel(s,r),open:r=>we(r)}),[s,yt,Ze,m.levels,i,v.showGitStatus,v.showIgnoredBadge,v.showOpenButton,g,we]),Rn=me(()=>({slots:{accessory:Nt},fallback:null}),[Nt]);if(i===void 0)return w.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},s.noWorkspace);let In=m.entries.filter(r=>v.showSystemFiles||!ta.has(r.name)).map(r=>({path:r.path,name:r.name,meta:{kind:r.type==="directory"?"directory":r.type==="file"?"file":"other",...r.symlink===!0?{link:!0}:{},...r.outside===!0?{outside:!0}:{},...Ze(r.path)?{hidden:!0}:{}}})),Mn=c("sidebar.files.tree",{root:V(i,i),entries:In,expanded:m.expanded,directories:m.directories,current:m.selected===null?void 0:V(i,m.selected),onToggle:r=>{if(m.expanded.includes(r.path)){m.toggle(r.path,!1);return}En(r)},onOpen:r=>{m.setSelected(r.path);let o=Date.now(),p=xt.current,k=p.path===r.path&&o-p.at<=Zn;xt.current={path:r.path,at:o},(k?Se.current.openPreviewOnDoubleClick:Se.current.openPreviewOnClick)&&we(r)},rowTriggerProps:Bn,canOpen:()=>!0},Rn);Le(()=>{let r=o=>{Z(void 0),f({kind:"rename",entry:{path:o.path,name:Ie(o.path),meta:{kind:o.kind}}})};return g.setRenameHandler(r),()=>g.setRenameHandler(void 0)},[g]);let Fn=B(r=>{if(m.pending!==null)return;if(r.key==="F2"&&m.selected!==null){r.preventDefault(),Z(void 0),f({kind:"rename",entry:{path:m.selected,name:Ie(m.selected),meta:{kind:m.levels.has(m.selected)?"directory":"file"}}});return}let o=m.selected;if(o===null)return;let p=V(i??"",o),k=m.levels.has(p)||m.expanded.includes(p);if(r.key===" "){if(!k)return;r.preventDefault(),m.toggle(o,!m.expanded.includes(p));return}if(r.key==="Enter"){if(r.preventDefault(),k){m.toggle(o,!m.expanded.includes(p));return}we({path:p,name:Ie(o),meta:{kind:"file"}})}},[m,i,we]),Ln=re===null?null:re.kind==="commit"?w.default.createElement(Ft,{copy:s,files:Ve,busy:K,error:xe,onConfirm:$n,onCancel:()=>{f(null),Z(void 0)}}):w.default.createElement(it,{copy:s,currentName:re.entry.name,busy:K,error:xe,onConfirm:r=>Cn(re.entry,r),onCancel:()=>{f(null),Z(void 0)}}),Pn=me(()=>{if(T===null)return[];let r={path:T.path,name:T.name,kind:T.kind},o=O[0],p=k=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:k,path:T.path}),credentials:"same-origin"})};return[o===void 0?null:{id:"reveal",label:s.revealIn(We[o]??o),icon:w.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14}),run:()=>{p(o)}},{id:"copy-path",label:s.copyAbsolute,icon:w.default.createElement(U.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{tt(T.path,T.path)}},{id:"copy-relative",label:s.copyRelative,icon:w.default.createElement(U.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{tt(T.path,ae(i??"",T.path))}},T.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:s.openInNotepad,icon:w.default.createElement(U.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let k=await D("/read",{sessionId:t,path:T.path});if(!k.ok){_(k.message??s.openInNotepadFail);return}_(void 0);let M=T.path.startsWith("/")?T.path:`${i??""}/${T.path}`;await window.__nanoNotepad.import(T.name,k.content,{sourcePath:M})}},{id:"rename",label:s.rename,icon:w.default.createElement(U.IconEditOutlineRegular,{width:14,height:14}),run:()=>{Z(void 0),f({kind:"rename",entry:{...r,meta:{kind:T.kind}}})}},{id:"delete",label:s.delete,tone:"danger",icon:w.default.createElement(U.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{_(void 0),_e(r)}}].filter(Boolean)},[T,s,O,i,tt]);return w.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":g.scheme()},w.default.createElement("div",{className:"nxe-header"},w.default.createElement("span",{className:"nxe-path",title:i,"data-nxe-path":"true"},i),w.default.createElement(je,{label:s.newFile,onClick:()=>{Et("file")}},la()),w.default.createElement(je,{label:s.newFolder,onClick:()=>{Et("folder")}},da()),w.default.createElement(je,{label:s.rename,disabled:m.selected===null,onClick:()=>{let r=m.selected;r!==null&&(Z(void 0),f({kind:"rename",entry:{path:r,name:Ie(r),meta:{kind:m.levels.has(r)?"directory":"file"}}}))}},ua()),w.default.createElement(ha,{copy:s,cwd:i??"",apps:O}),w.default.createElement(je,{label:s.reload,onClick:()=>{m.refresh(),ee(),Y()}},ca())),Pe===void 0?null:w.default.createElement("p",{className:"nxe-row-note",role:"status"},Pe),A===void 0?null:w.default.createElement("p",{className:"nxe-row-note nxe-note-error"},A),Ae===null?null:w.default.createElement(Ue,{copy:s,title:s.deleteTitle,busy:K,confirmLabel:s.delete,onConfirm:()=>{Sn(Ae)},onCancel:()=>{_e(null),_(void 0)},description:w.default.createElement(w.default.Fragment,null,s.deleteBody(Ae.name),Ae.kind==="directory"?w.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${s.deleteFolderNote}`):null)}),S===null?null:w.default.createElement(it,{copy:s,mode:"create",busy:K,currentName:S.proposed,onConfirm:r=>{Nn(r)},onCancel:()=>{R(null),_(void 0)}}),w.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:Fn},Mn),w.default.createElement(at,{text:Ke}),w.default.createElement(en,{copy:s,git:x,stats:H,statsState:y,prefs:v,onOpenBranch:()=>ke("branch"),onOpenCommit:()=>ke("commit"),onRetryStats:()=>{Y()},onOpenSettings:()=>mt(!0)}),Ln,w.default.createElement(Qt,{copy:s,open:gn,prefs:v,onClose:()=>mt(!1),setPref:(r,o)=>g.setPref(r,o)}),w.default.createElement(Wt,{copy:s,open:pt==="branch",git:x,busy:ft,error:gt,onClose:()=>{ke(null),le(void 0)},onPull:St,onCheckout:Tn,onRefresh:async()=>{await ee()},onOpenConflict:r=>{we({path:ie(i??"",r)}),ke(null)}}),w.default.createElement(Kt,{copy:s,open:pt==="commit",git:x,busy:ft,error:gt,onClose:()=>{ke(null),le(void 0)},onCommit:On,onPull:St,onOpenConflict:r=>{we({path:ie(i??"",r)}),ke(null)}}),w.default.createElement(nn,{menu:T,copy:s,actions:Pn,onClose:()=>se(null)}))}function je({label:e,onClick:n,children:t,disabled:a}){return w.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:a===!0},t)}function na(e,n){let t=e.selected;if(t===null)return n;let a=V(n,t);return e.levels.has(a)?a:Ge(a)}function aa(e,n,t){return e.levels.get(V(n,t))?.entries??[]}var ra=U.IconPlusOutlineRegular,oa=U.IconFolderCloseRegular,ia=U.IconEditOutlineRegular,sa=U.IconRefreshOutlineRegular;function la(){return w.default.createElement(ra,{width:16,height:16})}function da(){return w.default.createElement(oa,{width:16,height:16})}function ca(){return w.default.createElement(sa,{width:16,height:16})}function ua(){return w.default.createElement(ia,{width:16,height:16})}function ha({copy:e,cwd:n,apps:t}){let a=Array.isArray(t)?t:[];if(n===""||a.length===0)return null;let[l,c]=w.default.useState(a[0]),[u,g]=w.default.useState(!1),b=w.default.useRef(null),h=a.includes(l)?l:a[0];w.default.useEffect(()=>{if(!u)return;let s=x=>{b.current!==null&&!b.current.contains(x.target)&&g(!1)},v=x=>{x.key==="Escape"&&g(!1)};return document.addEventListener("pointerdown",s,!0),document.addEventListener("keydown",v,!0),()=>{document.removeEventListener("pointerdown",s,!0),document.removeEventListener("keydown",v,!0)}},[u]);let i=s=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:s,path:n}),credentials:"same-origin"})};return w.default.createElement("span",{className:"nxe-reveal",ref:b,"data-nxe-reveal":h},w.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(We[h]??h),"aria-label":e.revealIn(We[h]??h),onClick:()=>{i(h)}},w.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(h)}`,alt:"",width:14,height:14})),w.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),w.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(u),onClick:()=>g(s=>!s)},w.default.createElement("svg",{viewBox:"0 0 10 10",width:10,height:10,fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round","aria-hidden":"true"},w.default.createElement("path",{d:"M2.5 4L5 6.5 7.5 4"}))),u?w.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},a.map(s=>w.default.createElement("button",{key:s,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{c(s),g(!1),i(s)}},w.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},w.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(s)}`,alt:"",width:14,height:14})),w.default.createElement("span",{className:"nano-menu-label"},We[s]??s)))):null)}var We={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var pa={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`\u4ED3\u5E93 \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitDrawerBody:(e,n)=>n?`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${n} \xB7 ${e} \u5904\u6539\u52A8`:`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${e} \u5904\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchConflictBlocks:"\u8FD9\u4E9B\u6587\u4EF6\u8FD8\u5728\u51B2\u7A81\u4E2D\u3002\u89E3\u51B3\u4E4B\u524D\uFF0C\u8FD9\u5F20\u5361\u7247\u91CC\u7684\u5207\u6362\u5206\u652F\u4E0D\u4F1A\u6267\u884C\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u63D0\u4EA4\u56FE",localStaged:"\u5DF2\u6682\u5B58",localUnstaged:"\u672A\u6682\u5B58",localUntracked:"\u672A\u8DDF\u8E2A",localConflicts:"\u51B2\u7A81",filterChanges:"\u6309\u66F4\u6539\u7C7B\u578B\u7B5B\u9009",filterAll:"\u5168\u90E8",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Reload",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`Repository \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitDrawerBody:(e,n)=>n?`Working tree \xB7 ${n} \xB7 ${e} changes`:`Working tree \xB7 ${e} changes`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchConflictBlocks:"These files are still in conflict. Branch switches in this card do nothing until they are resolved.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"History",localStaged:"Staged",localUnstaged:"Unstaged",localUntracked:"Untracked",localConflicts:"Conflicts",filterChanges:"Filter by change type",filterAll:"All",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function ma(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function Te(e){return pa[ma(e)]}function hn(e,n,t,a){let l={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&a!==void 0?e.statusBoth(l):t!==void 0?e.statusStaged(l):a!==void 0?e.statusUnstaged(l):l}var pn=`${rt}

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
.nxe-note-error { color: var(--dsw-alias-danger, #cf222e); }
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
.nxe-acc-link svg { width: 12px; height: 12px; flex: none; }
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
.nxe-chip-sync { font-variant-numeric: tabular-nums; }

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
[data-nxe] .nxe-tree li[data-files-entry] > div > button + div {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 22px;
  padding-right: 10px;
}
[data-nxe] .nxe-tree li[data-files-entry] > div > button + div:empty { display: none; }

/* Ignored entries: a dedicated muted ink instead of an opacity blend. An opacity overlay sinks into the
   panel and reads as "nearly invisible" on dark; this ink stays clearly readable while obviously
   subordinate to a tracked row in both themes. */
[data-nxe] .nxe-tree li[data-files-entry] > div > button > span:last-child,
[data-nxe] .nxe-tree li[data-files-entry] > div > button > svg { transition: color .12s ease; }
[data-nxe] .nxe-tree li[data-files-entry]:has([data-nxe-ignored]) > div > button > span:last-child,
[data-nxe] .nxe-tree li[data-files-entry]:has([data-nxe-ignored]) > div > button > svg { color: var(--nxe-ignored-ink); }

/* Transient confirmation. Out of the flow and over the tree's lower edge, so showing and hiding it
   never moves a row: an inline row here shifted the whole tree when a copy confirmed. */
.nxe-toast {
  position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%);
  z-index: 5; pointer-events: none;
  padding: 4px 12px; border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-elevation-panel);
  font-size: 12px; line-height: 18px; white-space: nowrap;
  animation: nxe-toast-in .12s ease-out;
}
@keyframes nxe-toast-in {
  from { opacity: 0; transform: translate(-50%, 4px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .nxe-toast { animation: none; }
}

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
  /* Same 14px cell as the status letter. The slashed circle draws smaller than a bold M, so the
     glyph is one step larger to match the letter's cap height. Quiet ink, not an alert. */
  box-sizing: border-box; width: 14px; height: 14px; flex: none;
  font-size: 13px; font-weight: 500; line-height: 14px;
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
.nxe-local-filters { display: flex; flex-wrap: wrap; gap: 6px; }
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
.nxe-change {
  display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 6px; align-items: baseline;
  min-height: 20px; padding: 1px 4px; border-radius: var(--dsw-radius-sm);
  font-size: 12px; line-height: 18px;
}
.nxe-change-status {
  font-weight: 700; text-align: center; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}
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
`;var fn=q(F("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:ge,useCallback:yr,useEffect:kr,useState:Er}=ht.default,fa=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var ga="files",ut="nano-explorer-extra",mn={handler:void 0};function xa(){let e=Jt(),n=new Set;return{get:()=>e,set:t=>{e=t,Vt(e);for(let a of n)a()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function wa(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=pn,document.head.append(n),e.effect(()=>()=>n.remove());let t=xa(),a=h=>e.sessions.list.getSnapshot().byId[h]?.cwd,l=h=>{mn.handler?.(h)},c=()=>e.locale.getSnapshot().active,u=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",g=()=>({copy:Te(c()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:h=>t.subscribe(h),scheme:u,statusLabel:hn,onListed:()=>{},setRenameHandler:h=>{mn.handler=h},setPref:(h,i)=>t.set({...t.get(),[h]:i})});e.effect(()=>e.sidebarRightTabs.register({id:ut,kind:ga,priority:"extension",keepMounted:!0,title:()=>Te(c()).typeLabel,guide:[{id:"explorer",order:10,title:()=>Te(c()).typeLabel,description:()=>Te(c()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:ut,inject:()=>({nxe:g()})},un)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:ut},function({useTabInfo:i}){let{tab:s}=i();return ge(ht.default.Fragment,null,ge(fn.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),s.title)})),"nano-explorer-extra: files tab title");let b=e.get("contextMenus");if(b!=null)for(let h of["file","directory"])e.effect(()=>b.register({id:`nano-explorer-extra.${h}`,target:h,order:900,resolve:async i=>{let s=Te(c()),v=i.sessionId===void 0?void 0:a(i.sessionId),x=v===void 0?i.path:ae(v,i.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:s.copyRelative,failureLabel:s.copyFailed,run:()=>ba(x)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:s.rename,failureLabel:s.renameFailed,run:()=>l?.({path:i.path,kind:h==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${h} menu`);e.slots.inject("contextMenu.icon",()=>{let h=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},va),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},ya)];return()=>{for(let i of h)i()}})}async function ba(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function va(){return ge("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},ge("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),ge("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))}function ya(){return ge("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},ge("path",{d:"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"}),ge("path",{d:"M13.5 6.5 17.5 10.5"}))}return Wn(ka);})();
		return __nxeExport;
	}
});
