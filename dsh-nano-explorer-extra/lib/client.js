window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var An=Object.create;var Ge=Object.defineProperty;var Un=Object.getOwnPropertyDescriptor;var Hn=Object.getOwnPropertyNames;var Gn=Object.getPrototypeOf,jn=Object.prototype.hasOwnProperty;var z=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var Wn=(e,n)=>{for(var t in n)Ge(e,t,{get:n[t],enumerable:!0})},Ot=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let u of Hn(n))!jn.call(e,u)&&u!==t&&Ge(e,u,{get:()=>n[u],enumerable:!(a=Un(n,u))||a.enumerable});return e};var q=(e,n,t)=>(t=e!=null?An(Gn(e)):{},Ot(n||!e||!e.__esModule?Ge(t,"default",{value:e,enumerable:!0}):t,e)),qn=e=>Ot(Ge({},"__esModule",{value:!0}),e);var Ea={};Wn(Ea,{DEFAULT_PREFS:()=>Oe,apply:()=>ba,inject:()=>ga});var mt=q(z("react"),1);var x=q(z("react"),1);var Y=q(z("react"),1),lt=z("@deepseek-ai/dsh-client-ui-primitives");var ye=q(z("react"),1),Fe=z("@deepseek-ai/dsh-client-ui-primitives");function he({copy:e,title:n,description:t,confirmLabel:a,confirmDisabled:u,busy:c,error:h,danger:w,footer:v,maxHeight:l,width:i,region:s,onConfirm:b,onCancel:m,children:E}){return ye.default.createElement(Fe.Modal,{open:!0,onClose:m,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",l===void 0?"":"nano-dialog-capped",i===void 0?"":"nano-dialog-sized",s===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:v??ye.default.createElement(ye.default.Fragment,null,ye.default.createElement(Fe.Button,{variant:"outline",className:"nano-modal-action",onClick:m},e.cancel),ye.default.createElement(Fe.Button,{variant:w?"outline":"primary",className:w?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:u===!0||c===!0,onClick:b},a??e.confirm))},E,h===void 0?null:ye.default.createElement("p",{className:"nano-dialog-error",role:"alert"},h))}var ke=q(z("react"),1),{useCallback:Ca,useEffect:Bt,useRef:Rt,useState:Kn}=ke.default;function it({menu:e,actions:n,onClose:t,width:a=208}){let u=Rt(null),[c,h]=Kn(0),w=e===null?[]:n,v=w.length,l=Rt(w);l.current=w;let i=e===null?null:e.openedAt;if(Bt(()=>{i!==null&&h(0)},[i]),Bt(()=>{if(e===null)return;let E=N=>{u.current!==null&&!u.current.contains(N.target)&&t()},F=N=>{if(N.key==="Escape"){N.stopPropagation(),t();return}if(N.key==="ArrowDown"){N.preventDefault(),h(_=>(_+1)%v);return}if(N.key==="ArrowUp"){N.preventDefault(),h(_=>(_-1+v)%v);return}N.key==="Enter"&&(N.preventDefault(),t(),l.current[c]?.run())};return document.addEventListener("pointerdown",E,!0),document.addEventListener("keydown",F,!0),()=>{document.removeEventListener("pointerdown",E,!0),document.removeEventListener("keydown",F,!0)}},[e,c,v,t]),e===null||v===0)return null;let s=v*28+8,b=Math.min(e.x,(window.innerWidth||a)-a-8),m=Math.min(e.y,(window.innerHeight||s)-s-8);return ke.default.createElement("div",{className:"nano-menu",role:"menu",ref:u,style:{position:"fixed",left:`${Math.max(8,b)}px`,top:`${Math.max(8,m)}px`,minWidth:`${a}px`},"data-nano-menu":"true"},w.map((E,F)=>ke.default.createElement(Dt,{key:E.id,item:E,index:F,active:F===c,onHover:h,onRun:t})))}function Dt({item:e,index:n,active:t,onHover:a,onRun:u}){return ke.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>a(n),onClick:()=>{u(),e.run()}},e.icon===void 0?null:ke.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),ke.default.createElement("span",{className:"nano-menu-label"},e.label))}var It=q(z("react"),1);function ot({text:e}){return e==null?null:It.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var st=`
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
`;var{useState:Ft}=Y.default;function Te(e){return je(),Y.default.createElement(he,e)}function je(){Y.default.useEffect(()=>{let e=!0,n=(l,i)=>{for(let[s,b]of Object.entries(i))l.style[s]!==b&&(l.style[s]=b)},t=()=>{let l=null,i=0;for(let s of document.querySelectorAll("[data-nxe]")){let b=s.closest("[data-sidebar-right-pane]")??s;if(!(b instanceof HTMLElement))continue;let m=b.getBoundingClientRect(),E=m.width*m.height;E>i&&(l=b,i=E)}return l},a=null,u=null,c=()=>{if(!e)return;let l=t();if(!(l instanceof HTMLElement))return;l!==a&&typeof ResizeObserver=="function"&&(u?.disconnect(),a=l,u=new ResizeObserver(c),u.observe(l));let i=l.getBoundingClientRect();if(!(i.width<1||i.height<1))for(let s of document.querySelectorAll(".nano-dialog-card")){if(s.querySelector('[class*="nxe-"]')===null)continue;let b=s.parentElement;if(b instanceof HTMLElement&&(b.classList.add("nxe-confined-layer"),n(b,{position:"fixed",top:`${i.top}px`,left:`${i.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${i.width}px`,height:`${i.height}px`,padding:"12px"}),s.querySelector(".nxe-scm")!==null)){s.dataset.nxeFill="1";let m=l.getAttribute("data-theme");m&&s.setAttribute("data-theme",m),n(b,{display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",overflow:"hidden"}),n(s,{position:"relative",top:"auto",left:"auto",right:"auto",transform:"none"});let E=s.querySelector("[data-nxe-scm]")?.getAttribute("data-nxe-scm"),F=Math.max(240,i.height-24);if(E==="commit"){let N=`${Math.min(Math.round(window.innerHeight*.5),F)}px`;n(s,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:N,minHeight:N,maxHeight:N,display:"flex",flexDirection:"column",overflow:"hidden"})}else n(s,{width:"100%",maxWidth:"100%",minWidth:"0",margin:"0",height:"auto",minHeight:"0",maxHeight:`${Math.min(F,Math.round(i.height*.68))}px`,display:"",flexDirection:"",overflow:""})}}},h=new MutationObserver(c);h.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("resize",c);let w=0,v=()=>{e&&(document.querySelector('.nano-dialog-card [class*="nxe-"]')!==null&&c(),w=window.requestAnimationFrame(v))};return w=window.requestAnimationFrame(v),c(),()=>{e=!1,h.disconnect(),u?.disconnect(),window.cancelAnimationFrame(w),window.removeEventListener("resize",c);for(let l of document.querySelectorAll(".nxe-confined-layer")){l.classList.remove("nxe-confined-layer");for(let i of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction","overflow"])l.style.removeProperty(i)}for(let l of document.querySelectorAll("[data-nxe-fill]"))if(l instanceof HTMLElement){delete l.dataset.nxeFill;for(let i of["width","max-width","height","max-height","min-height","min-width","margin","position","top","left","right","transform","display","flex-direction","overflow"])l.style.removeProperty(i)}}},[])}function Mt({children:e}){return Y.default.createElement("div",{className:"nxe-dialog-field"},e)}function Lt({copy:e,files:n,busy:t,error:a,onConfirm:u,onCancel:c}){let[h,w]=Ft(""),v=h.trim()==="";return Y.default.createElement(Te,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:v,busy:t,error:a,onConfirm:()=>u(h),onCancel:c,description:e.commitBody(n.length)},Y.default.createElement(Mt,null,Y.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(l=>Y.default.createElement("li",{key:l.path,title:l.path},`${l.status} ${l.path}`))),Y.default.createElement(lt.Input,{value:h,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:l=>w(l.currentTarget.value)})))}function dt({copy:e,currentName:n,busy:t,error:a,onConfirm:u,onCancel:c,mode:h="rename"}){let[w,v]=Ft(n),l=w.trim()==="",i=h==="create";return Y.default.createElement(Te,{copy:e,title:i?e.newEntryTitle:e.renameTitle,confirmLabel:i?e.create:e.confirm,busy:t,error:a,confirmDisabled:l,onConfirm:()=>u(w),onCancel:c,description:i?e.newEntryBody(n):e.renameBody(n)},Y.default.createElement(Mt,null,Y.default.createElement(lt.Input,{value:w,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:s=>v(s.currentTarget.value),onKeyDown:s=>{s.key==="Enter"&&!l&&(s.preventDefault(),u(w))}})))}var d=q(z("react"),1),pe=z("@deepseek-ai/dsh-client-ui-primitives");function Me(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,a=0;for(;t>=1024&&a<n.length-1;)t/=1024,a+=1;return`${a===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[a]}`}function Pt(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function zt(e){let n=[],t=[],a=[],u=[];for(let c of e??[]){if(c?.status==="U"){u.push(c);continue}if(c?.status==="?"){a.push(c);continue}c?.staged&&n.push({...c,status:c.staged}),c?.unstaged?t.push({...c,status:c.unstaged}):c?.staged||t.push(c)}return{staged:n,unstaged:t,untracked:a,conflicts:u}}function At(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function ct(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function Ut(e,n,t){let a=new Map(e),u=n===""?"":`${n}/`;for(let c of a.keys())(u===""||c===n||c.startsWith(u))&&a.delete(c);for(let c of t)typeof c?.path=="string"&&c.path!==""&&a.set(c.path,c);return a}function Ht(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let a=Math.floor(t/60);if(a<24)return{unit:"hours",value:a};let u=Math.floor(a/24);if(u<30)return{unit:"days",value:u};let c=new Date(e*1e3),h=w=>String(w).padStart(2,"0");return{unit:"date",value:`${c.getFullYear()}-${h(c.getMonth()+1)}-${h(c.getDate())}`}}var{useEffect:jt,useState:We}=d.default;function _n(e,n){let t=Ht(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function Wt(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function Gt(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(a=>String(a??"").toLowerCase().includes(t))}function Yn({file:e}){let{name:n,dir:t}=At(e.path);return d.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},d.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),d.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:d.default.createElement("span",{className:"nxe-change-dir"},t)))}function ut({label:e,count:n,files:t,tone:a}){return t.length===0?null:d.default.createElement("section",{className:"nxe-scm-group","data-tone":a??"default"},d.default.createElement("h3",{className:"nxe-local-head","data-tone":a??"default"},d.default.createElement("span",null,e),d.default.createElement("span",{className:"nxe-local-badge"},String(n))),d.default.createElement("ul",{className:"nxe-drawer-list"},t.slice(0,400).map(u=>d.default.createElement(Yn,{key:`${a??""}:${u.path}`,file:u}))))}function Jn({copy:e,history:n,currentBranch:t}){let a=n??[];return d.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},d.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),a.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):d.default.createElement("ol",{className:"nxe-graph"},a.map((u,c)=>d.default.createElement("li",{key:`${u.hash}:${c}`,className:"nxe-graph-row","data-head":String(c===0),title:[u.hash,_n(e,u.time),u.subject].filter(h=>h!=="").join(" \xB7 ")},d.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},d.default.createElement("span",{className:"nxe-graph-dot"})),d.default.createElement("span",{className:"nxe-graph-subject"},d.default.createElement("span",{className:"nxe-graph-hash"},u.hash)," ",u.subject),d.default.createElement("span",{className:"nxe-graph-pills"},u.refs.slice(0,2).map(h=>d.default.createElement("span",{key:h,className:"nxe-pill","data-tone":h===t?"current":"default",title:h},h)))))))}function qt({copy:e,open:n,git:t,onClose:a,onPull:u,onRefresh:c,onCheckout:h,onOpenConflict:w,busy:v,error:l}){je();let[i,s]=We(""),[b,m]=We(null);if(jt(()=>{n||(s(""),m(null))},[n]),!n)return null;let E=Wt(t),F=t?.upstream??null,N=t?.behind??0,_=t?.ahead??0,ae=t?.history??[],y=[...t?.branches??[]].sort((g,V)=>g.current===!0&&V.current!==!0?-1:V.current===!0&&g.current!==!0?1:g.name.localeCompare(V.name)).filter(g=>Gt(i,[g.name,g.upstream,g.commit])),ne=(t?.worktrees??[]).filter(g=>Gt(i,[g.branch,g.path,g.head,ct(g.path)])),re=i.trim()!==""&&y.length===0&&ne.length===0,M=t?.conflicts??[],ie=e.branchDrawerSummary(E??e.detached,F===null?e.noUpstream:`${F} \xB7 ${e.factSyncValue(N,_)}`,e.worktreesHeadingCount((t?.worktrees??[]).length));return d.default.createElement(he,{copy:e,title:e.branchDrawerTitle,description:M.length===0?ie:`${ie} \xB7 ${e.factConflicted(M.length)}`,error:l,footer:d.default.createElement(d.default.Fragment,null,d.default.createElement(pe.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{c()}},e.refreshGit),F===null?null:d.default.createElement(pe.Button,{variant:"primary",className:"nano-modal-action",disabled:v===!0||N===0,title:N===0?e.pullNothing:e.pullNow,onClick:()=>{u()}},N>0?`${e.pullNow} ${N}`:e.pullNow)),onCancel:a},d.default.createElement("div",{className:"nxe-scm nxe-repo","data-nxe-scm":"branch"},M.length===0?null:d.default.createElement("section",{className:"nxe-repo-conflict","data-nxe-conflicts":String(M.length)},d.default.createElement("p",{className:"nxe-repo-conflict-title"},d.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!")," ",e.factConflicted(M.length)),d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchConflictBlocks),d.default.createElement("ul",{className:"nxe-drawer-list nxe-repo-conflict-list"},M.map(g=>d.default.createElement("li",{key:g,className:"nxe-change","data-status":"U"},d.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),d.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:g,onClick:()=>w?.(g)},g))))),d.default.createElement(Jn,{copy:e,history:ae,currentBranch:E}),d.default.createElement(pe.Input,{value:i,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:g=>s(g.currentTarget.value)}),re?d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):d.default.createElement(d.default.Fragment,null,d.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(y.length)),y.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):d.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},y.map(g=>d.default.createElement("li",{key:g.name,className:"nxe-drawer-row","data-current":String(g.current===!0),"data-blocked":String(g.inOtherWorktree===!0)},d.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:g.current===!0||g.inOtherWorktree===!0||v===!0||M.length>0,title:M.length>0?e.branchConflictBlocks:g.inOtherWorktree===!0?e.branchHeldElsewhere:g.name,onClick:()=>m(g.name),"data-nxe-checkout":g.name},g.name),g.commit===""?null:d.default.createElement("span",{className:"nxe-graph-hash"},g.commit),g.upstream===null?null:d.default.createElement("span",{className:"nxe-drawer-row-path",title:g.upstream},g.upstream),M.length>0&&g.current===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"danger"},"!"):null,g.inOtherWorktree===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):g.current===!0?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),d.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(ne.length)),ne.length===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):d.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},ne.map(g=>{let V=g.path===t?.root,G=g.detached?e.detached:g.branch??e.detached,we=typeof g.head=="string"?g.head.slice(0,7):"";return d.default.createElement("li",{key:g.path,className:"nxe-worktree","data-current":String(V),title:g.path},d.default.createElement("span",{className:"nxe-worktree-mark","data-current":String(V),"aria-hidden":"true"}),d.default.createElement("span",{className:"nxe-worktree-body"},d.default.createElement("span",{className:"nxe-worktree-line"},d.default.createElement("span",{className:"nxe-worktree-branch"},G),we===""?null:d.default.createElement("span",{className:"nxe-graph-hash"},we),V?d.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),d.default.createElement("span",{className:"nxe-worktree-path"},ct(g.path))))})))),b===null?null:d.default.createElement(Te,{copy:e,title:e.checkoutTitle(b),description:e.checkoutBody(b),confirmLabel:e.checkoutConfirm,busy:v,onConfirm:()=>{let g=b;m(null),h(g)},onCancel:()=>m(null)},d.default.createElement("p",{className:"nxe-drawer-empty"},e.checkoutBody(b))))}function Kt({copy:e,open:n,git:t,onClose:a,onCommit:u,busy:c,error:h,onOpenConflict:w}){je();let[v,l]=We(""),[i,s]=We("all");if(jt(()=>{n||s("all")},[n]),!n)return null;let b=t?.files??[],m=zt(b),E=m.conflicts.length>0?m.conflicts:(t?.conflicts??[]).map(y=>({path:y,status:"U"})),F=b.length,N=Wt(t),_=F>0&&E.length===0&&v.trim()!==""&&c!==!0,ae=()=>{_&&Promise.resolve(u(v)).then(y=>{y===!0&&l("")})};return d.default.createElement(he,{copy:e,title:e.commitDrawerTitle,description:e.commitDrawerBody(F,N??(t?.detached?e.detached:null)),error:h,footer:d.default.createElement(pe.Button,{variant:"primary",className:"nano-modal-action",disabled:!_,onClick:ae},e.commit),onCancel:a},d.default.createElement("div",{className:"nxe-scm nxe-local","data-nxe-scm":"commit"},d.default.createElement(pe.Input,{value:v,placeholder:N===null?e.commitPlaceholder:e.commitPlaceholderOn(N),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:y=>l(y.currentTarget.value),onKeyDown:y=>{y.key==="Enter"&&(y.metaKey||y.ctrlKey)&&(y.preventDefault(),ae())}}),d.default.createElement("div",{className:"nxe-local-filters",role:"group","aria-label":e.filterChanges},[{id:"all",label:e.filterAll,count:F},{id:"staged",label:e.localStaged,count:m.staged.length},{id:"unstaged",label:e.localUnstaged,count:m.unstaged.length},{id:"untracked",label:e.localUntracked,count:m.untracked.length},...E.length===0?[]:[{id:"conflict",label:e.localConflicts,count:E.length}]].map(y=>d.default.createElement(pe.Button,{key:y.id,variant:i===y.id?"primary":"outline",className:"nxe-local-filter",disabled:y.id!=="all"&&y.count===0,"aria-pressed":String(i===y.id),onClick:()=>s(y.id)},`${y.label} ${y.count}`))),i!=="all"&&i!=="conflict"||E.length===0?null:d.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},d.default.createElement("h3",{className:"nxe-local-head","data-tone":"danger"},d.default.createElement("span",null,e.localConflicts),d.default.createElement("span",{className:"nxe-local-badge"},String(E.length))),d.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),d.default.createElement("ul",{className:"nxe-drawer-list"},E.map(y=>d.default.createElement("li",{key:y.path,className:"nxe-change","data-status":"U"},d.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),d.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:y.path,onClick:()=>w(y.path)},y.path))))),F===0?d.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):d.default.createElement(d.default.Fragment,null,i==="all"||i==="staged"?d.default.createElement(ut,{label:e.localStaged,count:m.staged.length,files:m.staged,tone:"staged"}):null,i==="all"||i==="unstaged"?d.default.createElement(ut,{label:e.localUnstaged,count:m.unstaged.length,files:m.unstaged,tone:"unstaged"}):null,i==="all"||i==="untracked"?d.default.createElement(ut,{label:e.localUntracked,count:m.untracked.length,files:m.untracked,tone:"untracked"}):null)))}var H=q(z("react"),1),Qt=z("@deepseek-ai/dsh-client-ui-primitives");var Yt="dsh-nano-explorer-extra:prefs.v2",Vn="dsh-nano-explorer-extra:prefs.v1",Oe={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function Jt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _t(e){let n=Jt(e)?e:{},t={};for(let[a,u]of Object.entries(Oe))t[a]=typeof n[a]=="boolean"?n[a]:u;return t}function Vt(){try{let e=window.localStorage?.getItem(Yt);if(e!=null)return _t(JSON.parse(e));let n=window.localStorage?.getItem(Vn);if(n==null)return{...Oe};let t=JSON.parse(n),a=Jt(t)?{...t}:{};return delete a.openPreviewOnClick,delete a.openPreviewOnDoubleClick,_t(a)}catch{return{...Oe}}}function Xt(e){try{window.localStorage?.setItem(Yt,JSON.stringify(e))}catch{}}function me({label:e,hint:n,checked:t,onChange:a,warn:u}){return H.default.createElement("div",{className:"nxe-settings-row"},H.default.createElement("div",null,H.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:H.default.createElement("div",{className:"nxe-settings-hint"},n),u===!0?H.default.createElement("p",{className:"nxe-warn"},n):null),H.default.createElement(Qt.Switch,{checked:t,label:e,onChange:a}))}function Zt({copy:e,open:n,prefs:t,setPref:a,onClose:u}){if(!n)return null;let c=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return H.default.createElement(he,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:u,onConfirm:u},H.default.createElement(me,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:h=>a("openPreviewOnClick",h)}),H.default.createElement(me,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:h=>a("openPreviewOnDoubleClick",h)}),c?H.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,H.default.createElement(me,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:h=>a("showOpenButton",h)}),H.default.createElement(me,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:h=>a("showIgnoredBadge",h)}),H.default.createElement(me,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:h=>a("showGitStatus",h)}),H.default.createElement(me,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:h=>a("showSystemFiles",h)}),H.default.createElement(me,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:h=>a("showStatusBar",h)}),H.default.createElement(me,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:h=>a("statsExcludeGit",h)}))}var K=q(z("react"),1),qe=z("@deepseek-ai/dsh-client-ui-primitives");function en(e){return function({entry:t}){let a=e.copy(),u=e.statusOf(t.path),c=e.ignoredOf(t.path),h=e.linkOf(t.path),w=e.linkBrokenOf(t.path)===!0,v=t.meta?.kind!=="directory",l=v?void 0:e.folderStatusOf(t.path),i=e.showGit()&&!c,s=i?e.stagedOf(t.path):void 0,b=i?e.unstagedOf(t.path):void 0,m=i?e.remoteOf(t.path):void 0;return K.default.createElement("span",{className:"nxe-acc",...c?{"data-nxe-ignored":"true"}:{}},h===void 0?null:K.default.createElement("span",{className:"nxe-acc-link",title:w?a.linkBroken:h?a.symlinkOutsideBadge:a.symlinkBadge,"aria-label":w?a.linkBroken:h?a.symlinkOutsideBadge:a.symlinkBadge,"data-nxe-symlink":w?"broken":h?"outside":"inside"},K.default.createElement(qe.IconLinkOutlineRegular,{width:14,height:14,"aria-hidden":"true"})),m===void 0?null:K.default.createElement("span",{className:"nxe-acc-remote","data-status":m.status,"data-direction":m.direction,title:m.direction==="pulled"?a.remotePulled(m.status):a.remotePushed(m.status),"aria-label":m.direction==="pulled"?a.remotePulled(m.status):a.remotePushed(m.status)},`${m.direction==="pulled"?"\u2193":"\u2191"}${m.status}`),i&&u!==void 0?K.default.createElement("span",{className:"nxe-acc-letter","data-status":u,"data-staged":s===void 0?"false":"true",title:e.statusLabel(u,s,b),"aria-label":e.statusLabel(u,s,b)},u):null,i&&l!==void 0?K.default.createElement("span",{className:"nxe-acc-dot","data-status":l,title:e.statusLabel(l),"aria-label":e.statusLabel(l)}):null,c?K.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:a.ignoredBadge,"aria-label":a.ignoredBadge},K.default.createElement(qe.IconCloseCircleOutlineRegular,{width:14,height:14,"aria-hidden":"true"})):null,v&&e.showOpenButton()?K.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:a.openFile,"aria-label":`${a.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:E=>{E.stopPropagation(),e.open(t)}},K.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},K.default.createElement("path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}),K.default.createElement("path",{d:"M15 3h6v6"}),K.default.createElement("path",{d:"M10 14 21 3"}))):null)}}var T=q(z("react"),1);var j=z("@deepseek-ai/dsh-client-ui-primitives");function ht({icon:e,value:n,title:t,scope:a}){return T.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":a},e,T.default.createElement("span",{className:"nxe-figure-value"},n))}function tn(e){let{copy:n,git:t,stats:a,statsState:u,prefs:c,onOpenBranch:h,onOpenCommit:w}=e;if(!c.showStatusBar)return null;let v=[];if(t==null)v.push(T.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},T.default.createElement(j.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),T.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let i=t.detached?n.detached:t.branch??n.detached,s=t.files?.length??0,b=t.conflicts?.length??0,m=s>0;v.push(T.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(m),"data-conflicted":String(b>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(i,m,b),"aria-label":n.branchButtonTooltip(i,m,b),onClick:h},T.default.createElement(j.IconBranchOutlineRegular,{width:14,height:14}),T.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},i),m?T.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,b>0?T.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&v.push(T.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},T.default.createElement(j.IconArchiveOutlineRegular,{width:14,height:14}),T.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let E=t.upstream===null||t.upstream===void 0?void 0:Pt(t.ahead??0,t.behind??0);v.push(T.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(s),title:n.commitButtonTooltip(s,E===void 0?null:E),"aria-label":n.commitButtonTooltip(s,E===void 0?null:E),onClick:w},T.default.createElement(j.IconRefreshOutlineRegular,{width:14,height:14}),E===void 0?null:T.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},E),T.default.createElement("span",{className:"nxe-chip-badge","data-nxe-pending":String(s),"data-empty":String(s===0)},String(s))))}let l=[];if(u==="loading")l.push(T.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(u==="failed")l.push(T.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(a!=null){let i=a.truncated?"+":"",s=c.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";l.push(T.default.createElement(ht,{key:"dirs",scope:"directories",icon:T.default.createElement(j.IconFolderCloseRegular,{width:14,height:14}),value:`${a.directories}${i}`,title:n.statsTooltip(a.files,a.directories,Me(a.bytes))+s})),l.push(T.default.createElement(ht,{key:"files",scope:"files",icon:T.default.createElement(j.IconDeliverDocRegular,{width:14,height:14}),value:`${a.files}${i}`,title:n.statsTooltip(a.files,a.directories,Me(a.bytes))+s})),l.push(T.default.createElement(ht,{key:"bytes",scope:"bytes",icon:T.default.createElement(j.IconGaugeOutlineRegular,{width:14,height:14}),value:Me(a.bytes),title:n.statsSizeTooltip(Me(a.bytes))+s}))}return l.push(T.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},T.default.createElement(j.IconSettingsOutlineRegular,{width:14,height:14}))),T.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},T.default.createElement("div",{className:"nxe-status-left"},v),T.default.createElement("div",{className:"nxe-status-right"},l))}var nn=q(z("react"),1);function an({menu:e,actions:n,onClose:t}){return nn.default.createElement(it,{menu:e,actions:n,onClose:t})}var L=q(z("@deepseek-ai/dsh-client-ui-primitives"),1);var sn=q(z("react"),1);function de(e,n){let t=le(e),a=String(n??"").replace(/\\/gu,"/");return a===""?t:a.startsWith("/")||/^[A-Za-z]:\//u.test(a)?le(a):`${t==="/"?"":t}/${a}`.replace(/\/{2,}/gu,"/")}function J(e,n){return le(de(e,n))}function Xn(e,n){let t=le(e),a=le(n);return t===a?!0:a.startsWith(t==="/"?"/":`${t}/`)}function te(e,n){let t=le(e),a=le(n);return a===t?"":Xn(t,a)?a.slice(t==="/"?1:t.length+1):a}function Ke(e){let n=le(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Le(e){let n=le(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function le(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:Ee,useEffect:rn,useMemo:on,useRef:Pe,useState:ze}=sn.default;function ln(e){let{sessionId:n,root:t,request:a,prefs:u,onListed:c}=e,[h,w]=ze(()=>new Map),[v,l]=ze(()=>new Set),i=Pe(v);i.current=v;let[s,b]=ze(null),[m,E]=ze(null),[F,N]=ze(0),_=Pe(!0),ae=Pe(c);ae.current=c,rn(()=>()=>{_.current=!1},[]);let y=Ee(async(C,B=!1)=>{let $=J(t,C);B||w(D=>{let O=new Map(D);return O.get($)===void 0&&O.set($,{loading:!0,entries:[]}),O});let S=await a("/list",{sessionId:n,path:C});if(_.current)return w(D=>{let O=new Map(D),oe=O.get($);return S.ok?O.set($,{entries:S.entries,truncated:S.truncated===!0,outside:S.outside===!0,failed:oe?.failed===!0&&oe.entries?.length>0?oe.failed:!1}):O.set($,{entries:oe?.entries??[],failed:!0,message:S.message,code:S.code}),O}),ae.current?.(C,S.ok?S.entries.map(D=>D.name):[]),S},[t,n,a]),ne=Pe(void 0),re=Pe([]);rn(()=>{if(t!==void 0){if(ne.current!==t){ne.current=t,w(new Map),l(new Set),y(t);return}y(t,!0);for(let C of re.current)y(C,!0)}},[t,F,y]);let M=Ee(async()=>{re.current=[...i.current],N(C=>C+1)},[]),ie=Ee(C=>y(C,!0),[y]),g=Ee((C,B)=>{let $=J(t,C);l(S=>{let D=new Set(S);return B?D.add($):D.delete($),D}),B&&h.get($)===void 0&&y(C)},[t,h,y]),V=Ee(C=>{let B=J(t,C);w($=>{if($.has(B))return $;let S=new Map($);return S.set(B,{entries:[]}),S})},[t]),G=Ee(C=>{let B=J(t,C);w($=>{if(!$.has(B))return $;let S=new Map($);return S.delete(B),S})},[t]),we=Ee(C=>{let B=J(t,C);l($=>{let S=new Set;for(let D of $)D!==B&&!D.startsWith(`${B}/`)&&S.add(D);return S}),w($=>{let S=new Map;for(let[D,O]of $)D!==B&&!D.startsWith(`${B}/`)&&S.set(D,O);return S})},[t]),W=on(()=>{let C=[];for(let[B,$]of h)for(let S of $.entries??[]){let D=B===""?S.name:`${B}/${S.name}`;C.push({...S,path:D})}return C},[h]),Je=on(()=>{let C={};for(let[B,$]of h)$.loading===!0&&($.entries?.length??0)===0?C[B]={loading:!0}:$.failed===!0?C[B]={failure:$.message}:$.truncated===!0&&(C[B]={truncated:!0});return C},[h]);return{levels:h,entries:W,directories:Je,expanded:[...v],selected:s,setSelected:b,toggle:g,pending:m,setPending:E,refresh:M,refreshLevel:ie,loadLevel:y,forget:G,collapseUnder:we,knownEmpty:V}}var Qn=".md";function dn(e,n){let t=e==="file"?"untitled":"new-folder",a=new Set((n??[]).map(c=>String(c.name??"").toLowerCase())),u=c=>e==="file"?`${t}${c===1?"":`-${c}`}${Qn}`:`${t}${c===1?"":`-${c}`}`;for(let c=1;c<1e4;c+=1){let h=u(c);if(!a.has(h.toLowerCase()))return h}throw new Error("cannot find an unused name")}function cn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:R,useEffect:Be,useMemo:fe,useRef:ge,useState:A,useSyncExternalStore:Zn}=x.default,ea=400,ta=["U","D","M","A","R","?"],na=new Set([".git",".DS_Store"]);function un(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function hn(e){let{useTabInfo:n,sessionId:t,useSessions:a,renderSlot:u,renderFactorySlot:c,useContextMenu:h,nxe:w}=e,{tab:v,panel:l}=n(),i=a(r=>r.byId[t]?.cwd),s=w.copy,b=Zn(w.subscribePrefs,w.getPrefs,w.getPrefs),[m,E]=A(null),[F,N]=A(void 0),[_,ae]=A(null),[y,ne]=A("idle"),[re,M]=A(null),[ie,g]=A(!1),[V,G]=A(void 0),[we,W]=A(void 0),[Je,C]=A(void 0),[B,$]=A([]);Be(()=>{let r=!0;return(async()=>{try{let o=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!o.ok)return;let p=await o.json(),k=Array.isArray(p.apps)?p.apps:[];r&&$(k.filter(P=>typeof P=="string"))}catch{}})(),()=>{r=!1}},[]);let[S,D]=A(null),[O,oe]=A(null),[Ae,Ue]=A(null),[ft,be]=A(null),[xn,Ve]=A(!1),[gt,Se]=A(!1),[xt,se]=A(void 0),De=ge(0),[Xe,He]=A(()=>new Map);Be(()=>{be(null),se(void 0),Ve(!1),M(null),G(void 0),D(null),Ue(null),oe(null),He(new Map),N(void 0)},[t,i,v.visible]);let wt=ge({path:"",at:0}),Ne=ge(b);Ne.current=b;let I=R(async(r,o)=>{try{let p=await fetch(`/nano-explorer-extra${r}`,{method:o===void 0?"GET":"POST",headers:o===void 0?void 0:{"content-type":"application/json"},body:o===void 0?void 0:JSON.stringify(o),credentials:"same-origin",cache:"no-store"}),k=await p.json().catch(()=>({error:`HTTP ${p.status}`}));return p.ok?{ok:!0,...k}:{ok:!1,message:k?.error??`HTTP ${p.status}`}}catch(p){return{ok:!1,message:p instanceof Error?p.message:String(p)}}},[]),wn=R(async(r,o)=>{if(!Ne.current.showGitStatus||!Array.isArray(o)||o.length===0)return;let p=await I("/ignored",{sessionId:t,paths:o});!p.ok||!Array.isArray(p.ignored)||p.ignored.length===0||vn(k=>{let P=new Set(k),U=te(i??"",r);for(let ee of p.ignored)P.add(U===""?ee:`${U}/${ee}`);return P})},[I,t,i]),f=ln({sessionId:t,root:i,request:I,prefs:b,onListed:(r,o)=>{wn(r,o)}}),Ie=ge(0),bt=ge(null);bt.current=f;let vt=ge(async()=>{}),X=R(async()=>{if(i===void 0)return;if(!Ne.current.showGitStatus){E(null),N(void 0),He(new Map);return}let r=Ie.current+1;Ie.current=r;let o=await I(`/status?sessionId=${encodeURIComponent(t)}`);if(r===Ie.current){if(!o.ok){N(o.message);return}E(o.git??null),N(o.gitError),He(new Map);for(let p of bt.current?.expanded??[])vt.current(p)}},[i,t,I]),Q=R(async()=>{if(i===void 0)return;ne("loading");let r=await I(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!r.ok){ne("failed");return}ae(r.stats??null),ne("ok")},[i,t,I]);Be(()=>{X()},[X]),Be(()=>{Q()},[i]);let Qe=ge(0),Ce=R(()=>{window.clearTimeout(Qe.current),Qe.current=window.setTimeout(()=>{Q()},2e3)},[Q]);Be(()=>()=>{window.clearTimeout(Qe.current),window.clearTimeout(De.current)},[]);let bn=fe(()=>{let r=new Map;for(let o of f.entries)o.symlink===!0&&r.set(o.path,{outside:o.outside===!0});return r},[f.entries]),Ze=fe(()=>Array.isArray(m?.files)?m.files:[],[m]),et=fe(()=>{let r=new Map;for(let o of Ze)r.set(o.path,o);return r},[Ze]),[tt,vn]=A(()=>new Set),$e=m?.root,yt=ge($e);yt.current=$e;let ce=fe(()=>{if(Xe.size===0)return et;let r=new Map(et);for(let[o,p]of Xe)r.set(o,p);return r},[et,Xe]),Z=R(r=>{if($e==null)return;let o=de(i??"",r);return te($e,o)},[$e,i]),nt=R(r=>{let o=Z(r);if(o===void 0)return!1;if(tt.has(o))return!0;let p=o.split("/");for(let k=p.length-1;k>0;k-=1)if(tt.has(p.slice(0,k).join("/")))return!0;return!1},[tt,Z]),kt=R(r=>{let o=Z(r);if(o!==void 0)return ce.get(o)?.status},[ce,Z]),yn=R(r=>{let o=Z(r);if(o!==void 0)return ce.get(o)?.staged},[ce,Z]),kn=R(r=>{let o=Z(r);if(o!==void 0)return ce.get(o)?.unstaged},[ce,Z]),Et=fe(()=>{let r=new Map;for(let o of m?.remote?.pushed??[])r.set(o.path,{status:o.status,direction:"pushed"});for(let o of m?.remote?.pulled??[])r.set(o.path,{status:o.status,direction:"pulled"});return r},[m]),En=R(r=>{let o=Z(r);if(o!==void 0)return Et.get(o)},[Et,Z]),ve=R(r=>{let o=de(i??"",r.path),p=i??"",k=te(p,o),U=p!==""&&k!==o?`dsh-resource://file/session/${encodeURIComponent(t)}/${un(k)}`:`dsh-resource://file/absolute/${un(o.replace(/^\/+/,""))}`;l.isFloating?v.actions.openResource(U):v.actions.openResource(U,{paneId:l.id})},[i,t,v.actions,l.id,l.isFloating]),at=R(async r=>{if(i===void 0||!Ne.current.showGitStatus)return;let o=Ie.current,p=await I(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(r)}`);if(o!==Ie.current||!p.ok||p.git===null||p.git===void 0)return;let k=p.git.root,P=yt.current??i,U=te(P,r);if(U===r&&U!=="")return;let ee=[];for(let ue of p.git.files??[]){let $t=k===void 0?ue.path:`${k.replace(/\/+$/u,"")}/${ue.path}`,Tt=te(P,$t);Tt!==$t&&ee.push({...ue,path:Tt})}He(ue=>Ut(ue,U,ee))},[i,t,I]);vt.current=at;let Sn=R(async r=>{let o=await f.loadLevel(r.path);f.toggle(r.path,!0),o?.ok&&at(r.path)},[f,at]),Nn=R(async r=>{g(!0);let o=await I("/delete",{sessionId:t,path:r.path,kind:r.kind==="directory"?"directory":"file"});if(g(!1),!o.ok){W(o.message);return}Ue(null),W(void 0),f.forget(r.path),f.collapseUnder(r.path);let p=Ke(r.path);p!==r.path&&await f.refreshLevel(p),f.selected===r.path&&f.setSelected(null),Ce()},[t,I,f,Ce]),St=R(r=>{if(i===void 0)return;let o=aa(f,i),p=ra(f,i,o);W(void 0),D({kind:r,directory:o,proposed:dn(r,p)})},[i,f]),Cn=R(async r=>{if(S===null)return;let{kind:o,directory:p}=S,k=cn(r,s);if(!k.ok){W(k.message);return}g(!0);let P=await I(o==="file"?"/create-file":"/create-folder",{sessionId:t,directory:p,name:k.name});if(g(!1),!P.ok){W(P.message);return}D(null),W(void 0),await f.refreshLevel(p);let U=te(i??"",p),ee=de(i??"",`${U===""?"":`${U}/`}${k.name}`);f.setSelected(ee),o==="folder"&&(f.knownEmpty(ee),f.toggle(ee,!0)),Ce()},[S,s,i,t,I,f,Ce]),$n=R(async(r,o)=>{if(i===void 0)return;let p=de(i,r.path),k=r.meta?.kind==="directory"?"directory":"file";g(!0),G(void 0);let P=await I("/rename",{sessionId:t,path:p,name:o,kind:k});if(g(!1),!P.ok){G(P.message);return}M(null);let U=Ke(p);await f.refreshLevel(U),k==="directory"&&f.collapseUnder(p),f.setSelected(de(i,`${te(i,U)===""?"":`${te(i,U)}/`}${o.trim()}`)),Ce()},[i,t,I,f,Ce]),Tn=R(async r=>{g(!0),G(void 0);let o=await I("/commit",{sessionId:t,message:r});if(g(!1),!o.ok){G(o.message);return}M(null),await f.refresh(),await X(),await Q()},[t,I,f,X,Q]),Nt=R(async()=>{Se(!0),se(void 0);let r=await I("/pull",{sessionId:t});if(Se(!1),!r.ok){se(r.message);return}await f.refresh(),await X(),await Q()},[t,I,f,X,Q]),On=R(async r=>{Se(!0),se(void 0);let o=await I("/checkout",{sessionId:t,branch:r});if(Se(!1),!o.ok){se(o.message);return}C(s.branchSwitched(r)),window.clearTimeout(De.current),De.current=window.setTimeout(()=>C(void 0),2e3),await f.refresh(),await X(),await Q()},[t,I,f,X,Q,s]),Bn=R(async r=>{Se(!0),se(void 0);let o=await I("/commit",{sessionId:t,message:r});return Se(!1),o.ok?(await f.refresh(),await X(),await Q(),!0):(se(o.message),!1)},[t,I,f,X,Q]),rt=R(async(r,o)=>{try{await navigator.clipboard.writeText(o||r),C(s.copied),window.clearTimeout(De.current),De.current=window.setTimeout(()=>C(void 0),1600)}catch(p){W(p instanceof Error?p.message:String(p))}},[s.copied]),Rn=R((r,o)=>({onContextMenu:p=>{p.preventDefault(),p.stopPropagation(),f.setSelected(r.path),oe({x:p.clientX,y:p.clientY,path:r.path,name:r.name,kind:o,openedAt:Date.now()})}}),[f]),Dn=R(r=>{let o=Z(r);if(o===void 0)return;let p=o===""?"":`${o}/`,k,P=-1;for(let[U,ee]of ce){if(p!==""&&!U.startsWith(p))continue;let ue=ta.indexOf(ee.status);ue>P&&(P=ue,k=ee.status)}return k},[ce,Z]),Ct=fe(()=>en({copy:()=>s,statusOf:kt,stagedOf:yn,unstagedOf:kn,remoteOf:En,ignoredOf:nt,folderStatusOf:Dn,linkBrokenOf:r=>f.levels.get(J(i??"",r))?.code==="broken-link",linkOf:r=>{let o=bn.get(r);if(o!==void 0)return o.outside===!0},showGit:()=>b.showGitStatus,showIgnoredBadge:()=>b.showIgnoredBadge,showOpenButton:()=>b.showOpenButton,statusLabel:r=>w.statusLabel(s,r),open:r=>ve(r)}),[s,kt,nt,f.levels,i,b.showGitStatus,b.showIgnoredBadge,b.showOpenButton,w,ve]),In=fe(()=>({slots:{accessory:Ct},fallback:null}),[Ct]);if(i===void 0)return x.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},s.noWorkspace);let Fn=f.entries.filter(r=>b.showSystemFiles||!na.has(r.name)).map(r=>({path:r.path,name:r.name,meta:{kind:r.type==="directory"?"directory":r.type==="file"?"file":"other",...r.symlink===!0?{link:!0}:{},...r.outside===!0?{outside:!0}:{},...nt(r.path)?{hidden:!0}:{}}})),Mn=c("sidebar.files.tree",{root:J(i,i),entries:Fn,expanded:f.expanded,directories:f.directories,current:f.selected===null?void 0:J(i,f.selected),onToggle:r=>{if(f.expanded.includes(r.path)){f.toggle(r.path,!1);return}Sn(r)},onOpen:r=>{f.setSelected(r.path);let o=Date.now(),p=wt.current,k=p.path===r.path&&o-p.at<=ea;wt.current={path:r.path,at:o},(k?Ne.current.openPreviewOnDoubleClick:Ne.current.openPreviewOnClick)&&ve(r)},rowTriggerProps:Rn,canOpen:()=>!0},In);Be(()=>{let r=o=>{G(void 0),M({kind:"rename",entry:{path:o.path,name:Le(o.path),meta:{kind:o.kind}}})};return w.setRenameHandler(r),()=>w.setRenameHandler(void 0)},[w]);let Ln=R(r=>{if(f.pending!==null)return;if(r.key==="F2"&&f.selected!==null){r.preventDefault(),G(void 0),M({kind:"rename",entry:{path:f.selected,name:Le(f.selected),meta:{kind:f.levels.has(f.selected)?"directory":"file"}}});return}let o=f.selected;if(o===null)return;let p=J(i??"",o),k=f.levels.has(p)||f.expanded.includes(p);if(r.key===" "){if(!k)return;r.preventDefault(),f.toggle(o,!f.expanded.includes(p));return}if(r.key==="Enter"){if(r.preventDefault(),k){f.toggle(o,!f.expanded.includes(p));return}ve({path:p,name:Le(o),meta:{kind:"file"}})}},[f,i,ve]),Pn=re===null?null:re.kind==="commit"?x.default.createElement(Lt,{copy:s,files:Ze,busy:ie,error:V,onConfirm:Tn,onCancel:()=>{M(null),G(void 0)}}):x.default.createElement(dt,{copy:s,currentName:re.entry.name,busy:ie,error:V,onConfirm:r=>$n(re.entry,r),onCancel:()=>{M(null),G(void 0)}}),zn=fe(()=>{if(O===null)return[];let r={path:O.path,name:O.name,kind:O.kind},o=B[0],p=k=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:k,path:O.path}),credentials:"same-origin"})};return[o===void 0?null:{id:"reveal",label:s.revealIn(Ye[o]??o),icon:x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14}),run:()=>{p(o)}},{id:"copy-path",label:s.copyAbsolute,icon:x.default.createElement(L.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{rt(O.path,O.path)}},{id:"copy-relative",label:s.copyRelative,icon:x.default.createElement(L.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{rt(O.path,te(i??"",O.path))}},O.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:s.openInNotepad,icon:x.default.createElement(L.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let k=await I("/read",{sessionId:t,path:O.path});if(!k.ok){W(k.message??s.openInNotepadFail);return}W(void 0);let P=O.path.startsWith("/")?O.path:`${i??""}/${O.path}`;await window.__nanoNotepad.import(O.name,k.content,{sourcePath:P})}},{id:"rename",label:s.rename,icon:x.default.createElement(L.IconEditOutlineRegular,{width:14,height:14}),run:()=>{G(void 0),M({kind:"rename",entry:{...r,meta:{kind:O.kind}}})}},{id:"delete",label:s.delete,tone:"danger",icon:x.default.createElement(L.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{W(void 0),Ue(r)}}].filter(Boolean)},[O,s,B,i,rt]);return x.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":w.scheme()},x.default.createElement("div",{className:"nxe-header"},x.default.createElement("span",{className:"nxe-path",title:i,"data-nxe-path":"true"},i),x.default.createElement(_e,{label:s.newFile,onClick:()=>{St("file")}},da()),x.default.createElement(_e,{label:s.newFolder,onClick:()=>{St("folder")}},ca()),x.default.createElement(_e,{label:s.rename,disabled:f.selected===null,onClick:()=>{let r=f.selected;r!==null&&(G(void 0),M({kind:"rename",entry:{path:r,name:Le(r),meta:{kind:f.levels.has(r)?"directory":"file"}}}))}},ha()),x.default.createElement(pa,{copy:s,cwd:i??"",apps:B}),x.default.createElement(_e,{label:s.reload,onClick:()=>{f.refresh(),X()}},ua())),we===void 0?null:x.default.createElement("p",{className:"nxe-row-note",role:"status"},we),Ae===null?null:x.default.createElement(Te,{copy:s,title:s.deleteTitle,busy:ie,confirmLabel:s.delete,onConfirm:()=>{Nn(Ae)},onCancel:()=>{Ue(null),W(void 0)},description:x.default.createElement(x.default.Fragment,null,s.deleteBody(Ae.name),Ae.kind==="directory"?x.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${s.deleteFolderNote}`):null)}),S===null?null:x.default.createElement(dt,{copy:s,mode:"create",busy:ie,currentName:S.proposed,onConfirm:r=>{Cn(r)},onCancel:()=>{D(null),W(void 0)}}),x.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:Ln},Mn),x.default.createElement(ot,{text:Je}),F===void 0?null:x.default.createElement("div",{className:"nano-toast nxe-git-alert",role:"alert","data-nxe-git-alert":"true"},x.default.createElement(L.IconWarningOutlineRegular,{width:14,height:14,className:"nxe-git-alert-icon","aria-hidden":"true"}),x.default.createElement("span",{className:"nxe-git-alert-text"},F),x.default.createElement("button",{type:"button",className:"nxe-git-alert-x",title:s.dismiss,"aria-label":s.dismiss,onClick:()=>N(void 0)},x.default.createElement(L.IconCloseOutlineRegular,{width:12,height:12,"aria-hidden":"true"}))),x.default.createElement(tn,{copy:s,git:m,stats:_,statsState:y,prefs:b,onOpenBranch:()=>be("branch"),onOpenCommit:()=>be("commit"),onRetryStats:()=>{Q()},onOpenSettings:()=>Ve(!0)}),Pn,x.default.createElement(Zt,{copy:s,open:xn,prefs:b,onClose:()=>Ve(!1),setPref:(r,o)=>w.setPref(r,o)}),x.default.createElement(qt,{copy:s,open:ft==="branch",git:m,busy:gt,error:xt,onClose:()=>{be(null),se(void 0)},onPull:Nt,onCheckout:On,onRefresh:async()=>{await X()},onOpenConflict:r=>{ve({path:de(i??"",r)}),be(null)}}),x.default.createElement(Kt,{copy:s,open:ft==="commit",git:m,busy:gt,error:xt,onClose:()=>{be(null),se(void 0)},onCommit:Bn,onPull:Nt,onOpenConflict:r=>{ve({path:de(i??"",r)}),be(null)}}),x.default.createElement(an,{menu:O,copy:s,actions:zn,onClose:()=>oe(null)}))}function _e({label:e,onClick:n,children:t,disabled:a}){return x.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:a===!0},t)}function aa(e,n){let t=e.selected;if(t===null)return n;let a=J(n,t);return e.levels.has(a)?a:Ke(a)}function ra(e,n,t){return e.levels.get(J(n,t))?.entries??[]}var ia=L.IconPlusOutlineRegular,oa=L.IconFolderCloseRegular,sa=L.IconEditOutlineRegular,la=L.IconRefreshOutlineRegular;function da(){return x.default.createElement(ia,{width:16,height:16})}function ca(){return x.default.createElement(oa,{width:16,height:16})}function ua(){return x.default.createElement(la,{width:16,height:16})}function ha(){return x.default.createElement(sa,{width:16,height:16})}function pa({copy:e,cwd:n,apps:t}){let a=Array.isArray(t)?t:[];if(n===""||a.length===0)return null;let[u,c]=x.default.useState(a[0]),[h,w]=x.default.useState(!1),v=x.default.useRef(null),l=a.includes(u)?u:a[0];x.default.useEffect(()=>{if(!h)return;let s=m=>{v.current!==null&&!v.current.contains(m.target)&&w(!1)},b=m=>{m.key==="Escape"&&w(!1)};return document.addEventListener("pointerdown",s,!0),document.addEventListener("keydown",b,!0),()=>{document.removeEventListener("pointerdown",s,!0),document.removeEventListener("keydown",b,!0)}},[h]);let i=s=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:s,path:n}),credentials:"same-origin"})};return x.default.createElement("span",{className:"nxe-reveal",ref:v,"data-nxe-reveal":l},x.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(Ye[l]??l),"aria-label":e.revealIn(Ye[l]??l),onClick:()=>{i(l)}},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(l)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),x.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(h),onClick:()=>w(s=>!s)},x.default.createElement("svg",{viewBox:"0 0 10 10",width:10,height:10,fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round","aria-hidden":"true"},x.default.createElement("path",{d:"M2.5 4L5 6.5 7.5 4"}))),h?x.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},a.map(s=>x.default.createElement("button",{key:s,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{c(s),w(!1),i(s)}},x.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(s)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nano-menu-label"},Ye[s]??s)))):null)}var Ye={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var ma={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0 Git \u72B6\u6001",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",dismiss:"\u5173\u95ED",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`\u4ED3\u5E93 \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitDrawerBody:(e,n)=>n?`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${n} \xB7 ${e} \u5904\u6539\u52A8`:`\u672C\u5730\u5DE5\u4F5C\u533A \xB7 ${e} \u5904\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchConflictBlocks:"\u8FD9\u4E9B\u6587\u4EF6\u8FD8\u5728\u51B2\u7A81\u4E2D\u3002\u89E3\u51B3\u4E4B\u524D\uFF0C\u8FD9\u5F20\u5361\u7247\u91CC\u7684\u5207\u6362\u5206\u652F\u4E0D\u4F1A\u6267\u884C\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,checkoutTitle:e=>`\u5207\u6362\u5230 ${e}\uFF1F`,checkoutBody:e=>`\u5F53\u524D\u5DE5\u4F5C\u6811\u4F1A\u6539\u5230\u5206\u652F ${e}\u3002\u672A\u63D0\u4EA4\u7684\u66F4\u6539\u5982\u679C\u4F1A\u88AB\u8986\u76D6\uFF0C\u5207\u6362\u4F1A\u88AB\u62D2\u7EDD\u3002`,checkoutConfirm:"\u5207\u6362",worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u63D0\u4EA4\u56FE",localStaged:"\u5DF2\u6682\u5B58",localUnstaged:"\u672A\u6682\u5B58",localUntracked:"\u672A\u8DDF\u8E2A",localConflicts:"\u51B2\u7A81",filterChanges:"\u6309\u66F4\u6539\u7C7B\u578B\u7B5B\u9009",filterAll:"\u5168\u90E8",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Refresh Git status",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",dismiss:"Dismiss",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`Repository \xB7 ${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitDrawerBody:(e,n)=>n?`Working tree \xB7 ${n} \xB7 ${e} changes`:`Working tree \xB7 ${e} changes`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchConflictBlocks:"These files are still in conflict. Branch switches in this card do nothing until they are resolved.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,checkoutTitle:e=>`Switch to ${e}?`,checkoutBody:e=>`This worktree will move to ${e}. If local changes would be overwritten, the switch is refused.`,checkoutConfirm:"Switch",worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"History",localStaged:"Staged",localUnstaged:"Unstaged",localUntracked:"Untracked",localConflicts:"Conflicts",filterChanges:"Filter by change type",filterAll:"All",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function fa(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function Re(e){return ma[fa(e)]}function pn(e,n,t,a){let u={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&a!==void 0?e.statusBoth(u):t!==void 0?e.statusStaged(u):a!==void 0?e.statusUnstaged(u):u}var mn=`${st}

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
`;var gn=q(z("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:xe,useCallback:kr,useEffect:Er,useState:Sr}=mt.default,ga=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var xa="files",pt="nano-explorer-extra",fn={handler:void 0};function wa(){let e=Vt(),n=new Set;return{get:()=>e,set:t=>{e=t,Xt(e);for(let a of n)a()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function ba(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=mn,document.head.append(n),e.effect(()=>()=>n.remove());let t=wa(),a=l=>e.sessions.list.getSnapshot().byId[l]?.cwd,u=l=>{fn.handler?.(l)},c=()=>e.locale.getSnapshot().active,h=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",w=()=>({copy:Re(c()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:l=>t.subscribe(l),scheme:h,statusLabel:pn,onListed:()=>{},setRenameHandler:l=>{fn.handler=l},setPref:(l,i)=>t.set({...t.get(),[l]:i})});e.effect(()=>e.sidebarRightTabs.register({id:pt,kind:xa,priority:"extension",keepMounted:!0,title:()=>Re(c()).typeLabel,guide:[{id:"explorer",order:10,title:()=>Re(c()).typeLabel,description:()=>Re(c()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:pt,inject:()=>({nxe:w()})},hn)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:pt},function({useTabInfo:i}){let{tab:s}=i();return xe(mt.default.Fragment,null,xe(gn.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),s.title)})),"nano-explorer-extra: files tab title");let v=e.get("contextMenus");if(v!=null)for(let l of["file","directory"])e.effect(()=>v.register({id:`nano-explorer-extra.${l}`,target:l,order:900,resolve:async i=>{let s=Re(c()),b=i.sessionId===void 0?void 0:a(i.sessionId),m=b===void 0?i.path:te(b,i.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:s.copyRelative,failureLabel:s.copyFailed,run:()=>va(m)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:s.rename,failureLabel:s.renameFailed,run:()=>u?.({path:i.path,kind:l==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${l} menu`);e.slots.inject("contextMenu.icon",()=>{let l=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},ya),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},ka)];return()=>{for(let i of l)i()}})}async function va(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function ya(){return xe("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},xe("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),xe("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))}function ka(){return xe("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},xe("path",{d:"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"}),xe("path",{d:"M13.5 6.5 17.5 10.5"}))}return qn(Ea);})();
		return __nxeExport;
	}
});
