window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var An=Object.create;var ze=Object.defineProperty;var zn=Object.getOwnPropertyDescriptor;var Un=Object.getOwnPropertyNames;var Gn=Object.getPrototypeOf,Hn=Object.prototype.hasOwnProperty;var M=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var jn=(e,n)=>{for(var t in n)ze(e,t,{get:n[t],enumerable:!0})},Ct=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let d of Un(n))!Hn.call(e,d)&&d!==t&&ze(e,d,{get:()=>n[d],enumerable:!(a=zn(n,d))||a.enumerable});return e};var K=(e,n,t)=>(t=e!=null?An(Gn(e)):{},Ct(n||!e||!e.__esModule?ze(t,"default",{value:e,enumerable:!0}):t,e)),Wn=e=>Ct(ze({},"__esModule",{value:!0}),e);var ka={};jn(ka,{DEFAULT_PREFS:()=>Ne,apply:()=>wa,inject:()=>fa});var ut=K(M("react"),1);var x=K(M("react"),1);var Y=K(M("react"),1),ot=M("@deepseek-ai/dsh-client-ui-primitives");var ge=K(M("react"),1),Be=M("@deepseek-ai/dsh-client-ui-primitives");function de({copy:e,title:n,description:t,confirmLabel:a,confirmDisabled:d,busy:l,error:u,danger:f,footer:v,maxHeight:p,width:i,region:s,onConfirm:b,onCancel:w,children:T}){return ge.default.createElement(Be.Modal,{open:!0,onClose:w,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",p===void 0?"":"nano-dialog-capped",i===void 0?"":"nano-dialog-sized",s===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:v??ge.default.createElement(ge.default.Fragment,null,ge.default.createElement(Be.Button,{variant:"outline",className:"nano-modal-action",onClick:w},e.cancel),ge.default.createElement(Be.Button,{variant:f?"danger":"primary",className:"nano-modal-action",disabled:d===!0||l===!0,onClick:b},a??e.confirm))},T,u===void 0?null:ge.default.createElement("p",{className:"nano-dialog-error",role:"alert"},u))}var xe=K(M("react"),1),{useCallback:Na,useEffect:Tt,useRef:Ot,useState:Kn}=xe.default;function nt({menu:e,actions:n,onClose:t,width:a=208}){let d=Ot(null),[l,u]=Kn(0),f=e===null?[]:n,v=f.length,p=Ot(f);p.current=f;let i=e===null?null:e.openedAt;if(Tt(()=>{i!==null&&u(0)},[i]),Tt(()=>{if(e===null)return;let T=O=>{d.current!==null&&!d.current.contains(O.target)&&t()},j=O=>{if(O.key==="Escape"){O.stopPropagation(),t();return}if(O.key==="ArrowDown"){O.preventDefault(),u(P=>(P+1)%v);return}if(O.key==="ArrowUp"){O.preventDefault(),u(P=>(P-1+v)%v);return}O.key==="Enter"&&(O.preventDefault(),t(),p.current[l]?.run())};return document.addEventListener("pointerdown",T,!0),document.addEventListener("keydown",j,!0),()=>{document.removeEventListener("pointerdown",T,!0),document.removeEventListener("keydown",j,!0)}},[e,l,v,t]),e===null||v===0)return null;let s=v*28+8,b=Math.min(e.x,(window.innerWidth||a)-a-8),w=Math.min(e.y,(window.innerHeight||s)-s-8);return xe.default.createElement("div",{className:"nano-menu",role:"menu",ref:d,style:{position:"fixed",left:`${Math.max(8,b)}px`,top:`${Math.max(8,w)}px`,minWidth:`${a}px`},"data-nano-menu":"true"},f.map((T,j)=>xe.default.createElement(Bt,{key:T.id,item:T,index:j,active:j===l,onHover:u,onRun:t})))}function Bt({item:e,index:n,active:t,onHover:a,onRun:d}){return xe.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>a(n),onClick:()=>{d(),e.run()}},e.icon===void 0?null:xe.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),xe.default.createElement("span",{className:"nano-menu-label"},e.label))}var Dt=K(M("react"),1);function at({text:e}){return e==null?null:Dt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var rt=`
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
.nano-dialog-content > div:last-child { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
`;var{useState:Rt}=Y.default;function Ue(e){return Ge(),Y.default.createElement(de,e)}function Ge(){Y.default.useEffect(()=>{let e=!0,n=()=>{if(!e)return;let a=document.querySelector("[data-nxe]")?.closest("[data-sidebar-right-pane]")??document.querySelector("[data-nxe]");if(!(a instanceof HTMLElement))return;let d=a.getBoundingClientRect();if(!(d.width<1||d.height<1))for(let l of document.querySelectorAll(".nano-dialog-card")){if(l.querySelector('[class*="nxe-"]')===null)continue;let u=l.parentElement;if(u instanceof HTMLElement&&(u.classList.add("nxe-confined-layer"),Object.assign(u.style,{position:"fixed",top:`${d.top}px`,left:`${d.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${d.width}px`,height:`${d.height}px`,padding:"12px"}),l.querySelector(".nxe-scm")!==null)){l.dataset.nxeFill="1";let f=a.getAttribute("data-theme");f&&l.setAttribute("data-theme",f),u.style.display="flex",u.style.flexDirection="column",u.style.justifyContent="flex-end",Object.assign(l.style,{width:"100%",maxWidth:"100%",height:"auto",maxHeight:"100%",minHeight:"0",minWidth:"0",margin:"0"})}}},t=new MutationObserver(n);return t.observe(document.body,{childList:!0}),window.addEventListener("resize",n),n(),()=>{e=!1,t.disconnect(),window.removeEventListener("resize",n);for(let a of document.querySelectorAll(".nxe-confined-layer")){a.classList.remove("nxe-confined-layer");for(let d of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction"])a.style.removeProperty(d)}for(let a of document.querySelectorAll("[data-nxe-fill]"))if(a instanceof HTMLElement){delete a.dataset.nxeFill;for(let d of["width","max-width","height","max-height","min-height","min-width","margin"])a.style.removeProperty(d)}}},[])}function It({children:e}){return Y.default.createElement("div",{className:"nxe-dialog-field"},e)}function Ft({copy:e,files:n,busy:t,error:a,onConfirm:d,onCancel:l}){let[u,f]=Rt(""),v=u.trim()==="";return Y.default.createElement(Ue,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:v,busy:t,error:a,onConfirm:()=>d(u),onCancel:l,description:e.commitBody(n.length)},Y.default.createElement(It,null,Y.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(p=>Y.default.createElement("li",{key:p.path,title:p.path},`${p.status} ${p.path}`))),Y.default.createElement(ot.Input,{value:u,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:p=>f(p.currentTarget.value)})))}function it({copy:e,currentName:n,busy:t,error:a,onConfirm:d,onCancel:l,mode:u="rename"}){let[f,v]=Rt(n),p=f.trim()==="",i=u==="create";return Y.default.createElement(Ue,{copy:e,title:i?e.newEntryTitle:e.renameTitle,confirmLabel:i?e.create:e.confirm,busy:t,error:a,confirmDisabled:p,onConfirm:()=>d(f),onCancel:l,description:i?e.newEntryBody(n):e.renameBody(n)},Y.default.createElement(It,null,Y.default.createElement(ot.Input,{value:f,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:s=>v(s.currentTarget.value),onKeyDown:s=>{s.key==="Enter"&&!p&&(s.preventDefault(),d(f))}})))}var c=K(M("react"),1),ce=M("@deepseek-ai/dsh-client-ui-primitives");function De(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,a=0;for(;t>=1024&&a<n.length-1;)t/=1024,a+=1;return`${a===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[a]}`}function Mt(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function Lt(e){let n=[],t=[],a=[],d=[];for(let l of e??[]){if(l?.status==="U"){d.push(l);continue}if(l?.status==="?"){a.push(l);continue}l?.staged&&n.push({...l,status:l.staged}),l?.unstaged?t.push({...l,status:l.unstaged}):l?.staged||t.push(l)}return{staged:n,unstaged:t,untracked:a,conflicts:d}}function Pt(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function st(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function At(e,n,t){let a=new Map(e),d=n===""?"":`${n}/`;for(let l of a.keys())(d===""||l===n||l.startsWith(d))&&a.delete(l);for(let l of t)typeof l?.path=="string"&&l.path!==""&&a.set(l.path,l);return a}function zt(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let a=Math.floor(t/60);if(a<24)return{unit:"hours",value:a};let d=Math.floor(a/24);if(d<30)return{unit:"days",value:d};let l=new Date(e*1e3),u=f=>String(f).padStart(2,"0");return{unit:"date",value:`${l.getFullYear()}-${u(l.getMonth()+1)}-${u(l.getDate())}`}}var{useEffect:_n,useState:Gt}=c.default;function qn(e,n){let t=zt(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function Ht(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function Ut(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(a=>String(a??"").toLowerCase().includes(t))}function Yn({file:e}){let{name:n,dir:t}=Pt(e.path);return c.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},c.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),c.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:c.default.createElement("span",{className:"nxe-change-dir"},t)))}function lt({heading:e,files:n,tone:t}){return n.length===0?null:c.default.createElement("section",{className:"nxe-scm-group","data-tone":t??"default"},c.default.createElement("h3",{className:"nxe-drawer-heading"},e),c.default.createElement("ul",{className:"nxe-drawer-list"},n.slice(0,400).map(a=>c.default.createElement(Yn,{key:`${t??""}:${a.path}`,file:a}))))}function jt({copy:e,history:n,currentBranch:t}){let a=n??[];return c.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},c.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),a.length===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):c.default.createElement("ol",{className:"nxe-graph"},a.map((d,l)=>c.default.createElement("li",{key:`${d.hash}:${l}`,className:"nxe-graph-row","data-head":String(l===0),title:[d.hash,qn(e,d.time),d.subject].filter(u=>u!=="").join(" \xB7 ")},c.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},c.default.createElement("span",{className:"nxe-graph-dot"})),c.default.createElement("span",{className:"nxe-graph-subject"},c.default.createElement("span",{className:"nxe-graph-hash"},d.hash)," ",d.subject),c.default.createElement("span",{className:"nxe-graph-pills"},d.refs.slice(0,2).map(u=>c.default.createElement("span",{key:u,className:"nxe-pill","data-tone":u===t?"current":"default",title:u},u)))))))}function Wt({copy:e,open:n,git:t,onClose:a,onPull:d,onRefresh:l,onCheckout:u,busy:f,error:v}){Ge();let[p,i]=Gt("");if(_n(()=>{n||i("")},[n]),!n)return null;let s=Ht(t),b=t?.upstream??null,w=t?.behind??0,T=t?.ahead??0,j=t?.history??[],O=[...t?.branches??[]].sort((g,$)=>g.current===!0&&$.current!==!0?-1:$.current===!0&&g.current!==!0?1:g.name.localeCompare($.name)).filter(g=>Ut(p,[g.name,g.upstream,g.commit])),P=(t?.worktrees??[]).filter(g=>Ut(p,[g.branch,g.path,g.head,st(g.path)])),ne=p.trim()!==""&&O.length===0&&P.length===0;return c.default.createElement(de,{copy:e,title:e.branchDrawerTitle,description:e.branchDrawerSummary(s??e.detached,b===null?e.noUpstream:`${b} \xB7 ${e.factSyncValue(w,T)}`,(t?.files?.length??0)===0?e.factClean:e.factDirty(t?.files?.length??0)),error:v,footer:c.default.createElement(c.default.Fragment,null,c.default.createElement(ce.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{l()}},e.refreshGit),b===null?null:c.default.createElement(ce.Button,{variant:"primary",className:"nano-modal-action",disabled:f===!0||w===0,title:w===0?e.pullNothing:e.pullNow,onClick:()=>{d()}},w>0?`${e.pullNow} ${w}`:e.pullNow)),onCancel:a},c.default.createElement("div",{className:"nxe-scm","data-nxe-scm":"branch"},c.default.createElement(ce.Input,{value:p,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:g=>i(g.currentTarget.value)}),ne?c.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):c.default.createElement(c.default.Fragment,null,c.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(O.length)),O.length===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):c.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},O.map(g=>c.default.createElement("li",{key:g.name,className:"nxe-drawer-row","data-current":String(g.current===!0),"data-blocked":String(g.inOtherWorktree===!0)},c.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:g.current===!0||g.inOtherWorktree===!0||f===!0,title:g.inOtherWorktree===!0?e.branchHeldElsewhere:g.name,onClick:()=>{u(g.name)},"data-nxe-checkout":g.name},g.name),g.commit===""?null:c.default.createElement("span",{className:"nxe-graph-hash"},g.commit),g.upstream===null?null:c.default.createElement("span",{className:"nxe-drawer-row-path",title:g.upstream},g.upstream),g.inOtherWorktree===!0?c.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):g.current===!0?c.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),c.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(P.length)),P.length===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):c.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},P.map(g=>{let $=g.path===t?.root,ae=g.detached?e.detached:g.branch??e.detached,_=typeof g.head=="string"?g.head.slice(0,7):"";return c.default.createElement("li",{key:g.path,className:"nxe-worktree","data-current":String($),title:g.path},c.default.createElement("span",{className:"nxe-worktree-mark","data-current":String($),"aria-hidden":"true"}),c.default.createElement("span",{className:"nxe-worktree-body"},c.default.createElement("span",{className:"nxe-worktree-line"},c.default.createElement("span",{className:"nxe-worktree-branch"},ae),_===""?null:c.default.createElement("span",{className:"nxe-graph-hash"},_),$?c.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),c.default.createElement("span",{className:"nxe-worktree-path"},st(g.path))))})),c.default.createElement(jt,{copy:e,history:j,currentBranch:s}))))}function Kt({copy:e,open:n,git:t,onClose:a,onCommit:d,onPull:l,busy:u,error:f,onOpenConflict:v}){Ge();let[p,i]=Gt("");if(!n)return null;let s=t?.files??[],b=Lt(s),w=b.conflicts.length>0?b.conflicts:(t?.conflicts??[]).map($=>({path:$,status:"U"})),T=s.length,j=t?.upstream??null,O=t?.behind??0,P=Ht(t),ne=T>0&&w.length===0&&p.trim()!==""&&u!==!0,g=()=>{ne&&Promise.resolve(d(p)).then($=>{$===!0&&i("")})};return c.default.createElement(de,{copy:e,title:e.commitDrawerTitle,description:e.commitDrawerBody(T,P??(t?.detached?e.detached:null)),error:f,footer:c.default.createElement(c.default.Fragment,null,j===null?null:c.default.createElement(ce.Button,{variant:"outline",className:"nano-modal-action",disabled:u===!0||O===0,title:O===0?e.pullNothing:e.pullNow,onClick:()=>{l()}},O>0?`${e.pullNow} ${O}`:e.pullNow),c.default.createElement(ce.Button,{variant:"primary",className:"nano-modal-action",disabled:!ne,onClick:g},e.commit)),onCancel:a},c.default.createElement("div",{className:"nxe-scm","data-nxe-scm":"commit"},c.default.createElement(ce.Input,{value:p,placeholder:P===null?e.commitPlaceholder:e.commitPlaceholderOn(P),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:$=>i($.currentTarget.value),onKeyDown:$=>{$.key==="Enter"&&($.metaKey||$.ctrlKey)&&($.preventDefault(),g())}}),c.default.createElement("p",{className:"nxe-scm-counts"},c.default.createElement("span",{className:"nxe-scm-count"},e.countStaged(b.staged.length)),c.default.createElement("span",{className:"nxe-scm-count"},e.countUnstaged(b.unstaged.length)),c.default.createElement("span",{className:"nxe-scm-count"},e.countUntracked(b.untracked.length)),w.length===0?null:c.default.createElement("span",{className:"nxe-scm-count","data-tone":"danger"},e.countConflict(w.length))),c.default.createElement(jt,{copy:e,history:t?.history,currentBranch:P}),w.length===0?null:c.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},c.default.createElement("h3",{className:"nxe-drawer-heading"},e.conflictsHeading(w.length)),c.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),c.default.createElement("ul",{className:"nxe-drawer-list"},w.map($=>c.default.createElement("li",{key:$.path,className:"nxe-change","data-status":"U"},c.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),c.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:$.path,onClick:()=>v($.path)},$.path))))),T===0?c.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):c.default.createElement(c.default.Fragment,null,c.default.createElement(lt,{heading:e.groupStaged(b.staged.length),files:b.staged,tone:"staged"}),c.default.createElement(lt,{heading:e.groupUnstaged(b.unstaged.length),files:b.unstaged,tone:"unstaged"}),c.default.createElement(lt,{heading:e.groupUntracked(b.untracked.length),files:b.untracked,tone:"untracked"}))))}var z=K(M("react"),1),Xt=M("@deepseek-ai/dsh-client-ui-primitives");var qt="dsh-nano-explorer-extra:prefs.v2",Jn="dsh-nano-explorer-extra:prefs.v1",Ne={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function Yt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _t(e){let n=Yt(e)?e:{},t={};for(let[a,d]of Object.entries(Ne))t[a]=typeof n[a]=="boolean"?n[a]:d;return t}function Jt(){try{let e=window.localStorage?.getItem(qt);if(e!=null)return _t(JSON.parse(e));let n=window.localStorage?.getItem(Jn);if(n==null)return{...Ne};let t=JSON.parse(n),a=Yt(t)?{...t}:{};return delete a.openPreviewOnClick,delete a.openPreviewOnDoubleClick,_t(a)}catch{return{...Ne}}}function Vt(e){try{window.localStorage?.setItem(qt,JSON.stringify(e))}catch{}}function ue({label:e,hint:n,checked:t,onChange:a,warn:d}){return z.default.createElement("div",{className:"nxe-settings-row"},z.default.createElement("div",null,z.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:z.default.createElement("div",{className:"nxe-settings-hint"},n),d===!0?z.default.createElement("p",{className:"nxe-warn"},n):null),z.default.createElement(Xt.Switch,{checked:t,label:e,onChange:a}))}function Qt({copy:e,open:n,prefs:t,setPref:a,onClose:d}){if(!n)return null;let l=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return z.default.createElement(de,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:d},z.default.createElement(ue,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:u=>a("openPreviewOnClick",u)}),z.default.createElement(ue,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:u=>a("openPreviewOnDoubleClick",u)}),l?z.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,z.default.createElement(ue,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:u=>a("showOpenButton",u)}),z.default.createElement(ue,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:u=>a("showIgnoredBadge",u)}),z.default.createElement(ue,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:u=>a("showGitStatus",u)}),z.default.createElement(ue,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:u=>a("showSystemFiles",u)}),z.default.createElement(ue,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:u=>a("showStatusBar",u)}),z.default.createElement(ue,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:u=>a("statsExcludeGit",u)}))}var G=K(M("react"),1);function Zt(e){return function({entry:t}){let a=e.copy(),d=e.statusOf(t.path),l=e.ignoredOf(t.path),u=e.linkOf(t.path),f=e.linkBrokenOf(t.path)===!0,v=t.meta?.kind!=="directory",p=v?void 0:e.folderStatusOf(t.path),i=e.showGit()&&!l,s=i?e.stagedOf(t.path):void 0,b=i?e.unstagedOf(t.path):void 0,w=i?e.remoteOf(t.path):void 0;return G.default.createElement("span",{className:"nxe-acc",...l?{"data-nxe-ignored":"true"}:{}},u===void 0?null:G.default.createElement("span",{className:"nxe-acc-link",title:f?a.linkBroken:u?a.symlinkOutsideBadge:a.symlinkBadge,"aria-label":f?a.linkBroken:u?a.symlinkOutsideBadge:a.symlinkBadge,"data-nxe-symlink":f?"broken":u?"outside":"inside"},G.default.createElement("svg",{viewBox:"0 0 24 24",width:11,height:11,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round","aria-hidden":"true"},G.default.createElement("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),G.default.createElement("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}),f?G.default.createElement("path",{d:"M3 3l18 18"}):null)),w===void 0?null:G.default.createElement("span",{className:"nxe-acc-remote","data-status":w.status,"data-direction":w.direction,title:w.direction==="pulled"?a.remotePulled(w.status):a.remotePushed(w.status),"aria-label":w.direction==="pulled"?a.remotePulled(w.status):a.remotePushed(w.status)},`${w.direction==="pulled"?"\u2193":"\u2191"}${w.status}`),i&&d!==void 0?G.default.createElement("span",{className:"nxe-acc-letter","data-status":d,"data-staged":s===void 0?"false":"true",title:e.statusLabel(d,s,b),"aria-label":e.statusLabel(d,s,b)},d):null,i&&p!==void 0?G.default.createElement("span",{className:"nxe-acc-dot","data-status":p,title:e.statusLabel(p),"aria-label":e.statusLabel(p)}):null,l?G.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:a.ignoredBadge,"aria-label":a.ignoredBadge},"\u2298"):null,v&&e.showOpenButton()?G.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:a.openFile,"aria-label":`${a.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:T=>{T.stopPropagation(),e.open(t)}},G.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},G.default.createElement("path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}),G.default.createElement("path",{d:"M15 3h6v6"}),G.default.createElement("path",{d:"M10 14 21 3"}))):null)}}var N=K(M("react"),1);var H=M("@deepseek-ai/dsh-client-ui-primitives");function dt({icon:e,value:n,title:t,scope:a}){return N.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":a},e,N.default.createElement("span",{className:"nxe-figure-value"},n))}function en(e){let{copy:n,git:t,stats:a,statsState:d,prefs:l,onOpenBranch:u,onOpenCommit:f}=e;if(!l.showStatusBar)return null;let v=[];if(t==null)v.push(N.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},N.default.createElement(H.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),N.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let i=t.detached?n.detached:t.branch??n.detached,s=t.files?.length??0,b=t.conflicts?.length??0,w=s>0;v.push(N.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(w),"data-conflicted":String(b>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(i,w,b),"aria-label":n.branchButtonTooltip(i,w,b),onClick:u},N.default.createElement(H.IconBranchOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},i),w?N.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,b>0?N.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&v.push(N.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},N.default.createElement(H.IconArchiveOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let T=t.upstream===null||t.upstream===void 0?void 0:Mt(t.ahead??0,t.behind??0);v.push(N.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(s),title:n.commitButtonTooltip(s,T===void 0?null:T),"aria-label":n.commitButtonTooltip(s,T===void 0?null:T),onClick:f},N.default.createElement(H.IconRefreshOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-chip-count","data-nxe-pending":String(s)},String(s)),T===void 0?null:N.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},T)))}let p=[];if(d==="loading")p.push(N.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(d==="failed")p.push(N.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(a!=null){let i=a.truncated?"+":"",s=l.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";p.push(N.default.createElement(dt,{key:"dirs",scope:"directories",icon:N.default.createElement(H.IconFolderCloseRegular,{width:14,height:14}),value:`${a.directories}${i}`,title:n.statsTooltip(a.files,a.directories,De(a.bytes))+s})),p.push(N.default.createElement(dt,{key:"files",scope:"files",icon:N.default.createElement(H.IconDeliverDocRegular,{width:14,height:14}),value:`${a.files}${i}`,title:n.statsTooltip(a.files,a.directories,De(a.bytes))+s})),p.push(N.default.createElement(dt,{key:"bytes",scope:"bytes",icon:N.default.createElement(H.IconGaugeOutlineRegular,{width:14,height:14}),value:De(a.bytes),title:n.statsSizeTooltip(De(a.bytes))+s}))}return p.push(N.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},N.default.createElement(H.IconSettingsOutlineRegular,{width:14,height:14}))),N.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},N.default.createElement("div",{className:"nxe-status-left"},v),N.default.createElement("div",{className:"nxe-status-right"},p))}var tn=K(M("react"),1);function nn({menu:e,actions:n,onClose:t}){return tn.default.createElement(nt,{menu:e,actions:n,onClose:t})}var U=K(M("@deepseek-ai/dsh-client-ui-primitives"),1);var on=K(M("react"),1);function pe(e,n){let t=re(e),a=String(n??"").replace(/\\/gu,"/");return a===""?t:a.startsWith("/")||/^[A-Za-z]:\//u.test(a)?re(a):`${t==="/"?"":t}/${a}`.replace(/\/{2,}/gu,"/")}function J(e,n){return re(pe(e,n))}function Vn(e,n){let t=re(e),a=re(n);return t===a?!0:a.startsWith(t==="/"?"/":`${t}/`)}function ee(e,n){let t=re(e),a=re(n);return a===t?"":Vn(t,a)?a.slice(t==="/"?1:t.length+1):a}function He(e){let n=re(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Re(e){let n=re(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function re(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:we,useEffect:an,useMemo:rn,useRef:Ie,useState:Fe}=on.default;function sn(e){let{sessionId:n,root:t,request:a,prefs:d,onListed:l}=e,[u,f]=Fe(()=>new Map),[v,p]=Fe(()=>new Set),i=Ie(v);i.current=v;let[s,b]=Fe(null),[w,T]=Fe(null),[j,O]=Fe(0),P=Ie(!0),ne=Ie(l);ne.current=l,an(()=>()=>{P.current=!1},[]);let g=we(async(E,B=!1)=>{let S=J(t,E);B||f(I=>{let C=new Map(I);return C.get(S)===void 0&&C.set(S,{loading:!0,entries:[]}),C});let k=await a("/list",{sessionId:n,path:E});if(P.current)return f(I=>{let C=new Map(I),oe=C.get(S);return k.ok?C.set(S,{entries:k.entries,truncated:k.truncated===!0,outside:k.outside===!0,failed:oe?.failed===!0&&oe.entries?.length>0?oe.failed:!1}):C.set(S,{entries:oe?.entries??[],failed:!0,message:k.message,code:k.code}),C}),ne.current?.(E,k.ok?k.entries.map(I=>I.name):[]),k},[t,n,a]),$=Ie(void 0),ae=Ie([]);an(()=>{if(t!==void 0){if($.current!==t){$.current=t,f(new Map),p(new Set),g(t);return}g(t,!0);for(let E of ae.current)g(E,!0)}},[t,j,g]);let _=we(async()=>{ae.current=[...i.current],O(E=>E+1)},[]),be=we(E=>g(E,!0),[g]),te=we((E,B)=>{let S=J(t,E);p(k=>{let I=new Set(k);return B?I.add(S):I.delete(S),I}),B&&u.get(S)===void 0&&g(E)},[t,u,g]),Le=we(E=>{let B=J(t,E);f(S=>{if(S.has(B))return S;let k=new Map(S);return k.set(B,{entries:[]}),k})},[t]),V=we(E=>{let B=J(t,E);f(S=>{if(!S.has(B))return S;let k=new Map(S);return k.delete(B),k})},[t]),Pe=we(E=>{let B=J(t,E);p(S=>{let k=new Set;for(let I of S)I!==B&&!I.startsWith(`${B}/`)&&k.add(I);return k}),f(S=>{let k=new Map;for(let[I,C]of S)I!==B&&!I.startsWith(`${B}/`)&&k.set(I,C);return k})},[t]),W=rn(()=>{let E=[];for(let[B,S]of u)for(let k of S.entries??[]){let I=B===""?k.name:`${B}/${k.name}`;E.push({...k,path:I})}return E},[u]),Ke=rn(()=>{let E={};for(let[B,S]of u)S.loading===!0&&(S.entries?.length??0)===0?E[B]={loading:!0}:S.failed===!0?E[B]={failure:S.message}:S.truncated===!0&&(E[B]={truncated:!0});return E},[u]);return{levels:u,entries:W,directories:Ke,expanded:[...v],selected:s,setSelected:b,toggle:te,pending:w,setPending:T,refresh:_,refreshLevel:be,loadLevel:g,forget:V,collapseUnder:Pe,knownEmpty:Le}}var Xn=".md";function ln(e,n){let t=e==="file"?"untitled":"new-folder",a=new Set((n??[]).map(l=>String(l.name??"").toLowerCase())),d=l=>e==="file"?`${t}${l===1?"":`-${l}`}${Xn}`:`${t}${l===1?"":`-${l}`}`;for(let l=1;l<1e4;l+=1){let u=d(l);if(!a.has(u.toLowerCase()))return u}throw new Error("cannot find an unused name")}function dn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:D,useEffect:Me,useMemo:me,useRef:he,useState:L,useSyncExternalStore:Qn}=x.default,Zn=400,ea=["U","D","M","A","R","?"],ta=new Set([".git",".DS_Store"]);function cn(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function un(e){let{useTabInfo:n,sessionId:t,useSessions:a,renderSlot:d,renderFactorySlot:l,useContextMenu:u,nxe:f}=e,{tab:v,panel:p}=n(),i=a(r=>r.byId[t]?.cwd),s=f.copy,b=Qn(f.subscribePrefs,f.getPrefs,f.getPrefs),[w,T]=L(null),[j,O]=L(void 0),[P,ne]=L(null),[g,$]=L("idle"),[ae,_]=L(null),[be,te]=L(!1),[Le,V]=L(void 0),[Pe,W]=L(void 0),[Ke,E]=L(void 0),[B,S]=L([]);Me(()=>{let r=!0;return(async()=>{try{let o=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!o.ok)return;let m=await o.json(),y=Array.isArray(m.apps)?m.apps:[];r&&S(y.filter(F=>typeof F=="string"))}catch{}})(),()=>{r=!1}},[]);let[k,I]=L(null),[C,oe]=L(null),[Ae,_e]=L(null),[pt,Ce]=L(null),[gn,mt]=L(!1),[ht,ve]=L(!1),[ft,ie]=L(void 0),Te=he(0),[qe,Ye]=L(()=>new Map),gt=he({path:"",at:0}),ye=he(b);ye.current=b;let R=D(async(r,o)=>{try{let m=await fetch(`/nano-explorer-extra${r}`,{method:o===void 0?"GET":"POST",headers:o===void 0?void 0:{"content-type":"application/json"},body:o===void 0?void 0:JSON.stringify(o),credentials:"same-origin",cache:"no-store"}),y=await m.json().catch(()=>({error:`HTTP ${m.status}`}));return m.ok?{ok:!0,...y}:{ok:!1,message:y?.error??`HTTP ${m.status}`}}catch(m){return{ok:!1,message:m instanceof Error?m.message:String(m)}}},[]),xn=D(async(r,o)=>{if(!ye.current.showGitStatus||!Array.isArray(o)||o.length===0)return;let m=await R("/ignored",{sessionId:t,paths:o});!m.ok||!Array.isArray(m.ignored)||m.ignored.length===0||bn(y=>{let F=new Set(y),A=ee(i??"",r);for(let Z of m.ignored)F.add(A===""?Z:`${A}/${Z}`);return F})},[R,t,i]),h=sn({sessionId:t,root:i,request:R,prefs:b,onListed:(r,o)=>{xn(r,o)}}),Oe=he(0),xt=he(null);xt.current=h;let wt=he(async()=>{}),X=D(async()=>{if(i===void 0)return;if(!ye.current.showGitStatus){T(null),O(void 0),Ye(new Map);return}let r=Oe.current+1;Oe.current=r;let o=await R(`/status?sessionId=${encodeURIComponent(t)}`);if(r===Oe.current){if(!o.ok){O(o.message);return}T(o.git??null),O(o.gitError),Ye(new Map);for(let m of xt.current?.expanded??[])wt.current(m)}},[i,t,R]),q=D(async()=>{if(i===void 0)return;$("loading");let r=await R(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!r.ok){$("failed");return}ne(r.stats??null),$("ok")},[i,t,R]);Me(()=>{X()},[X]),Me(()=>{q()},[i]);let Je=he(0),ke=D(()=>{window.clearTimeout(Je.current),Je.current=window.setTimeout(()=>{q()},2e3)},[q]);Me(()=>()=>{window.clearTimeout(Je.current),window.clearTimeout(Te.current)},[]);let wn=me(()=>{let r=new Map;for(let o of h.entries)o.symlink===!0&&r.set(o.path,{outside:o.outside===!0});return r},[h.entries]),Ve=me(()=>Array.isArray(w?.files)?w.files:[],[w]),Xe=me(()=>{let r=new Map;for(let o of Ve)r.set(o.path,o);return r},[Ve]),[Qe,bn]=L(()=>new Set),Ee=w?.root,bt=he(Ee);bt.current=Ee;let se=me(()=>{if(qe.size===0)return Xe;let r=new Map(Xe);for(let[o,m]of qe)r.set(o,m);return r},[Xe,qe]),Q=D(r=>{if(Ee==null)return;let o=pe(i??"",r);return ee(Ee,o)},[Ee,i]),Ze=D(r=>{let o=Q(r);if(o===void 0)return!1;if(Qe.has(o))return!0;let m=o.split("/");for(let y=m.length-1;y>0;y-=1)if(Qe.has(m.slice(0,y).join("/")))return!0;return!1},[Qe,Q]),vt=D(r=>{let o=Q(r);if(o!==void 0)return se.get(o)?.status},[se,Q]),vn=D(r=>{let o=Q(r);if(o!==void 0)return se.get(o)?.staged},[se,Q]),yn=D(r=>{let o=Q(r);if(o!==void 0)return se.get(o)?.unstaged},[se,Q]),yt=me(()=>{let r=new Map;for(let o of w?.remote?.pushed??[])r.set(o.path,{status:o.status,direction:"pushed"});for(let o of w?.remote?.pulled??[])r.set(o.path,{status:o.status,direction:"pulled"});return r},[w]),kn=D(r=>{let o=Q(r);if(o!==void 0)return yt.get(o)},[yt,Q]),Se=D(r=>{let o=pe(i??"",r.path),m=i??"",y=ee(m,o),A=m!==""&&y!==o?`dsh-resource://file/session/${encodeURIComponent(t)}/${cn(y)}`:`dsh-resource://file/absolute/${cn(o.replace(/^\/+/,""))}`;p.isFloating?v.actions.openResource(A):v.actions.openResource(A,{paneId:p.id})},[i,t,v.actions,p.id,p.isFloating]),et=D(async r=>{if(i===void 0||!ye.current.showGitStatus)return;let o=Oe.current,m=await R(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(r)}`);if(o!==Oe.current||!m.ok||m.git===null||m.git===void 0)return;let y=m.git.root,F=bt.current??i,A=ee(F,r);if(A===r&&A!=="")return;let Z=[];for(let le of m.git.files??[]){let Nt=y===void 0?le.path:`${y.replace(/\/+$/u,"")}/${le.path}`,$t=ee(F,Nt);$t!==Nt&&Z.push({...le,path:$t})}Ye(le=>At(le,A,Z))},[i,t,R]);wt.current=et;let En=D(async r=>{let o=await h.loadLevel(r.path);h.toggle(r.path,!0),o?.ok&&et(r.path)},[h,et]),Sn=D(async r=>{te(!0);let o=await R("/delete",{sessionId:t,path:r.path,kind:r.kind==="directory"?"directory":"file"});if(te(!1),!o.ok){W(o.message);return}_e(null),W(void 0),h.forget(r.path),h.collapseUnder(r.path);let m=He(r.path);m!==r.path&&await h.refreshLevel(m),h.selected===r.path&&h.setSelected(null),ke()},[t,R,h,ke]),kt=D(r=>{if(i===void 0)return;let o=na(h,i),m=aa(h,i,o);W(void 0),I({kind:r,directory:o,proposed:ln(r,m)})},[i,h]),Nn=D(async r=>{if(k===null)return;let{kind:o,directory:m}=k,y=dn(r,s);if(!y.ok){W(y.message);return}te(!0);let F=await R(o==="file"?"/create-file":"/create-folder",{sessionId:t,directory:m,name:y.name});if(te(!1),!F.ok){W(F.message);return}I(null),W(void 0),await h.refreshLevel(m);let A=ee(i??"",m),Z=pe(i??"",`${A===""?"":`${A}/`}${y.name}`);h.setSelected(Z),o==="folder"&&(h.knownEmpty(Z),h.toggle(Z,!0)),ke()},[k,s,i,t,R,h,ke]),$n=D(async(r,o)=>{if(i===void 0)return;let m=pe(i,r.path),y=r.meta?.kind==="directory"?"directory":"file";te(!0),V(void 0);let F=await R("/rename",{sessionId:t,path:m,name:o,kind:y});if(te(!1),!F.ok){V(F.message);return}_(null);let A=He(m);await h.refreshLevel(A),y==="directory"&&h.collapseUnder(m),h.setSelected(pe(i,`${ee(i,A)===""?"":`${ee(i,A)}/`}${o.trim()}`)),ke()},[i,t,R,h,ke]),Cn=D(async r=>{te(!0),V(void 0);let o=await R("/commit",{sessionId:t,message:r});if(te(!1),!o.ok){V(o.message);return}_(null),await h.refresh(),await X(),await q()},[t,R,h,X,q]),Et=D(async()=>{ve(!0),ie(void 0);let r=await R("/pull",{sessionId:t});if(ve(!1),!r.ok){ie(r.message);return}await h.refresh(),await X(),await q()},[t,R,h,X,q]),Tn=D(async r=>{ve(!0),ie(void 0);let o=await R("/checkout",{sessionId:t,branch:r});if(ve(!1),!o.ok){ie(o.message);return}E(s.branchSwitched(r)),window.clearTimeout(Te.current),Te.current=window.setTimeout(()=>E(void 0),2e3),await h.refresh(),await X(),await q()},[t,R,h,X,q,s]),On=D(async r=>{ve(!0),ie(void 0);let o=await R("/commit",{sessionId:t,message:r});return ve(!1),o.ok?(await h.refresh(),await X(),await q(),!0):(ie(o.message),!1)},[t,R,h,X,q]),tt=D(async(r,o)=>{try{await navigator.clipboard.writeText(o||r),E(s.copied),window.clearTimeout(Te.current),Te.current=window.setTimeout(()=>E(void 0),1600)}catch(m){W(m instanceof Error?m.message:String(m))}},[s.copied]),Bn=D((r,o)=>({onContextMenu:m=>{m.preventDefault(),m.stopPropagation(),h.setSelected(r.path),oe({x:m.clientX,y:m.clientY,path:r.path,name:r.name,kind:o,openedAt:Date.now()})}}),[h]),Dn=D(r=>{let o=Q(r);if(o===void 0)return;let m=o===""?"":`${o}/`,y,F=-1;for(let[A,Z]of se){if(m!==""&&!A.startsWith(m))continue;let le=ea.indexOf(Z.status);le>F&&(F=le,y=Z.status)}return y},[se,Q]),St=me(()=>Zt({copy:()=>s,statusOf:vt,stagedOf:vn,unstagedOf:yn,remoteOf:kn,ignoredOf:Ze,folderStatusOf:Dn,linkBrokenOf:r=>h.levels.get(J(i??"",r))?.code==="broken-link",linkOf:r=>{let o=wn.get(r);if(o!==void 0)return o.outside===!0},showGit:()=>b.showGitStatus,showIgnoredBadge:()=>b.showIgnoredBadge,showOpenButton:()=>b.showOpenButton,statusLabel:r=>f.statusLabel(s,r),open:r=>Se(r)}),[s,vt,Ze,h.levels,i,b.showGitStatus,b.showIgnoredBadge,b.showOpenButton,f,Se]),Rn=me(()=>({slots:{accessory:St},fallback:null}),[St]);if(i===void 0)return x.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},s.noWorkspace);let In=h.entries.filter(r=>b.showSystemFiles||!ta.has(r.name)).map(r=>({path:r.path,name:r.name,meta:{kind:r.type==="directory"?"directory":r.type==="file"?"file":"other",...r.symlink===!0?{link:!0}:{},...r.outside===!0?{outside:!0}:{},...Ze(r.path)?{hidden:!0}:{}}})),Fn=l("sidebar.files.tree",{root:J(i,i),entries:In,expanded:h.expanded,directories:h.directories,current:h.selected===null?void 0:J(i,h.selected),onToggle:r=>{if(h.expanded.includes(r.path)){h.toggle(r.path,!1);return}En(r)},onOpen:r=>{h.setSelected(r.path);let o=Date.now(),m=gt.current,y=m.path===r.path&&o-m.at<=Zn;gt.current={path:r.path,at:o},(y?ye.current.openPreviewOnDoubleClick:ye.current.openPreviewOnClick)&&Se(r)},rowTriggerProps:Bn,canOpen:()=>!0},Rn);Me(()=>{let r=o=>{V(void 0),_({kind:"rename",entry:{path:o.path,name:Re(o.path),meta:{kind:o.kind}}})};return f.setRenameHandler(r),()=>f.setRenameHandler(void 0)},[f]);let Mn=D(r=>{if(h.pending!==null)return;if(r.key==="F2"&&h.selected!==null){r.preventDefault(),V(void 0),_({kind:"rename",entry:{path:h.selected,name:Re(h.selected),meta:{kind:h.levels.has(h.selected)?"directory":"file"}}});return}let o=h.selected;if(o===null)return;let m=J(i??"",o),y=h.levels.has(m)||h.expanded.includes(m);if(r.key===" "){if(!y)return;r.preventDefault(),h.toggle(o,!h.expanded.includes(m));return}if(r.key==="Enter"){if(r.preventDefault(),y){h.toggle(o,!h.expanded.includes(m));return}Se({path:m,name:Re(o),meta:{kind:"file"}})}},[h,i,Se]),Ln=ae===null?null:ae.kind==="commit"?x.default.createElement(Ft,{copy:s,files:Ve,busy:be,error:Le,onConfirm:Cn,onCancel:()=>{_(null),V(void 0)}}):x.default.createElement(it,{copy:s,currentName:ae.entry.name,busy:be,error:Le,onConfirm:r=>$n(ae.entry,r),onCancel:()=>{_(null),V(void 0)}}),Pn=me(()=>{if(C===null)return[];let r={path:C.path,name:C.name,kind:C.kind},o=B[0],m=y=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:y,path:C.path}),credentials:"same-origin"})};return[o===void 0?null:{id:"reveal",label:s.revealIn(We[o]??o),icon:x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14}),run:()=>{m(o)}},{id:"copy-path",label:s.copyAbsolute,icon:x.default.createElement(U.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{tt(C.path,C.path)}},{id:"copy-relative",label:s.copyRelative,icon:x.default.createElement(U.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{tt(C.path,ee(i??"",C.path))}},C.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:s.openInNotepad,icon:x.default.createElement(U.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let y=await R("/read",{sessionId:t,path:C.path});if(!y.ok){W(y.message??s.openInNotepadFail);return}W(void 0);let F=C.path.startsWith("/")?C.path:`${i??""}/${C.path}`;await window.__nanoNotepad.import(C.name,y.content,{sourcePath:F})}},{id:"rename",label:s.rename,icon:x.default.createElement(U.IconEditOutlineRegular,{width:14,height:14}),run:()=>{V(void 0),_({kind:"rename",entry:{...r,meta:{kind:C.kind}}})}},{id:"delete",label:s.delete,tone:"danger",icon:x.default.createElement(U.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{W(void 0),_e(r)}}].filter(Boolean)},[C,s,B,i,tt]);return x.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":f.scheme()},x.default.createElement("div",{className:"nxe-header"},x.default.createElement("span",{className:"nxe-path",title:i,"data-nxe-path":"true"},i),x.default.createElement(je,{label:s.newFile,onClick:()=>{kt("file")}},la()),x.default.createElement(je,{label:s.newFolder,onClick:()=>{kt("folder")}},da()),x.default.createElement(je,{label:s.rename,disabled:h.selected===null,onClick:()=>{let r=h.selected;r!==null&&(V(void 0),_({kind:"rename",entry:{path:r,name:Re(r),meta:{kind:h.levels.has(r)?"directory":"file"}}}))}},ua()),x.default.createElement(pa,{copy:s,cwd:i??"",apps:B}),x.default.createElement(je,{label:s.reload,onClick:()=>{h.refresh(),X(),q()}},ca())),Pe===void 0?null:x.default.createElement("p",{className:"nxe-row-note",role:"status"},Pe),j===void 0?null:x.default.createElement("p",{className:"nxe-row-note nxe-note-error"},j),Ae===null?null:x.default.createElement(Ue,{copy:s,title:s.deleteTitle,busy:be,confirmLabel:s.delete,onConfirm:()=>{Sn(Ae)},onCancel:()=>{_e(null),W(void 0)},description:x.default.createElement(x.default.Fragment,null,s.deleteBody(Ae.name),Ae.kind==="directory"?x.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${s.deleteFolderNote}`):null)}),k===null?null:x.default.createElement(it,{copy:s,mode:"create",busy:be,currentName:k.proposed,onConfirm:r=>{Nn(r)},onCancel:()=>{I(null),W(void 0)}}),x.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:Mn},Fn),x.default.createElement(at,{text:Ke}),x.default.createElement(en,{copy:s,git:w,stats:P,statsState:g,prefs:b,onOpenBranch:()=>Ce("branch"),onOpenCommit:()=>Ce("commit"),onRetryStats:()=>{q()},onOpenSettings:()=>mt(!0)}),Ln,x.default.createElement(Qt,{copy:s,open:gn,prefs:b,onClose:()=>mt(!1),setPref:(r,o)=>f.setPref(r,o)}),x.default.createElement(Wt,{copy:s,open:pt==="branch",git:w,busy:ht,error:ft,onClose:()=>{Ce(null),ie(void 0)},onPull:Et,onCheckout:Tn,onRefresh:async()=>{await X()}}),x.default.createElement(Kt,{copy:s,open:pt==="commit",git:w,busy:ht,error:ft,onClose:()=>{Ce(null),ie(void 0)},onCommit:On,onPull:Et,onOpenConflict:r=>{Se({path:pe(i??"",r)}),Ce(null)}}),x.default.createElement(nn,{menu:C,copy:s,actions:Pn,onClose:()=>oe(null)}))}function je({label:e,onClick:n,children:t,disabled:a}){return x.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:a===!0},t)}function na(e,n){let t=e.selected;if(t===null)return n;let a=J(n,t);return e.levels.has(a)?a:He(a)}function aa(e,n,t){return e.levels.get(J(n,t))?.entries??[]}var ra=U.IconPlusOutlineRegular,oa=U.IconFolderCloseRegular,ia=U.IconEditOutlineRegular,sa=U.IconRefreshOutlineRegular;function la(){return x.default.createElement(ra,{width:16,height:16})}function da(){return x.default.createElement(oa,{width:16,height:16})}function ca(){return x.default.createElement(sa,{width:16,height:16})}function ua(){return x.default.createElement(ia,{width:16,height:16})}function pa({copy:e,cwd:n,apps:t}){let a=Array.isArray(t)?t:[];if(n===""||a.length===0)return null;let[d,l]=x.default.useState(a[0]),[u,f]=x.default.useState(!1),v=x.default.useRef(null),p=a.includes(d)?d:a[0];x.default.useEffect(()=>{if(!u)return;let s=w=>{v.current!==null&&!v.current.contains(w.target)&&f(!1)},b=w=>{w.key==="Escape"&&f(!1)};return document.addEventListener("pointerdown",s,!0),document.addEventListener("keydown",b,!0),()=>{document.removeEventListener("pointerdown",s,!0),document.removeEventListener("keydown",b,!0)}},[u]);let i=s=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:s,path:n}),credentials:"same-origin"})};return x.default.createElement("span",{className:"nxe-reveal",ref:v,"data-nxe-reveal":p},x.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(We[p]??p),"aria-label":e.revealIn(We[p]??p),onClick:()=>{i(p)}},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(p)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),x.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(u),onClick:()=>f(s=>!s)},x.default.createElement("svg",{viewBox:"0 0 10 10",width:10,height:10,fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round","aria-hidden":"true"},x.default.createElement("path",{d:"M2.5 4L5 6.5 7.5 4"}))),u?x.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},a.map(s=>x.default.createElement("button",{key:s,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{l(s),f(!1),i(s)}},x.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(s)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nano-menu-label"},We[s]??s)))):null)}var We={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var ma={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitDrawerBody:(e,n)=>n?`${n} \xB7 ${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`:`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u6700\u8FD1\u63D0\u4EA4",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Reload",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitDrawerBody:(e,n)=>n?`${n} \xB7 ${e} files changed`:`${e} files changed`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"Recent commits",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function ha(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function $e(e){return ma[ha(e)]}function pn(e,n,t,a){let d={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&a!==void 0?e.statusBoth(d):t!==void 0?e.statusStaged(d):a!==void 0?e.statusUnstaged(d):d}var mn=`${rt}

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
  /* Sized by its contents: a fixed min-width plus a gap could not hold the glyph and clipped it to a
     couple of pixels. The rail right-aligns this wrapper, so content size is enough to line the marks
     up. */
  display: inline-flex; align-items: center; justify-content: flex-end;
  flex: 0 0 auto; gap: 0;
}
.nxe-acc-letter {
  font-size: 12px; font-weight: 800; line-height: 1; letter-spacing: 0;
  /* No fixed width and no padding: the glyph keeps its natural ink, which is what the eye lines up
     against the 6px dot. Tabular figures and a fixed box only squeezed the mark narrower. */
  display: inline-block; padding: 0; margin: 0;
  text-align: right; white-space: nowrap;
  /* The rail right-aligns its content, so a narrower glyph still ends on the dot's edge. */
}
/* The mark column is fixed by the letter rule below; this selector only keeps the colour hooks. */
.nxe-acc-letter[data-status] { text-align: right; }
.nxe-acc-letter[data-status="M"] { color: var(--nxe-git-modified); }
.nxe-acc-letter[data-status="A"] { color: var(--nxe-git-added); }
.nxe-acc-letter[data-status="D"] { color: var(--nxe-git-deleted); }
.nxe-acc-letter[data-status="R"] { color: var(--nxe-git-renamed); }
.nxe-acc-letter[data-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-acc-letter[data-status="?"] { color: var(--nxe-git-untracked); }
.nxe-acc-link { display: inline-flex; color: var(--dsw-alias-label-tertiary); }
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
  width: 6px; height: 6px; border-radius: 50%; background: currentColor;
  /* Same 6px column as the letter, flush right. */
  flex: none; margin: 0;
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
  font-size: 10px; font-weight: 600; line-height: 1; letter-spacing: 0;
  display: inline-flex; align-items: center; white-space: nowrap;
  color: var(--dsw-alias-label-tertiary); opacity: .95;
}
.nxe-acc-remote[data-direction="pulled"] { color: var(--dsw-alias-link, #2f81f7); }
.nxe-acc-remote[data-direction="pushed"] { color: var(--nxe-git-modified); }

/* A local letter that came through the index keeps full weight; one that lives only in the working
   tree is drawn lighter, so "already staged" is visible without a second glyph. */
.nxe-acc-letter[data-staged="false"] { opacity: .62; }

/* An ignored row's own mark, drawn where the status letter would be. */
.nxe-acc-ignored-letter {
  /* Quiet by design: an ignored entry is muted, so its mark must not read as an alert. */
  font-size: 11px; font-weight: 400; line-height: 1;
  display: inline-flex; align-items: center;
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
`;var fn=K(M("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:fe,useCallback:yr,useEffect:kr,useState:Er}=ut.default,fa=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var ga="files",ct="nano-explorer-extra",hn={handler:void 0};function xa(){let e=Jt(),n=new Set;return{get:()=>e,set:t=>{e=t,Vt(e);for(let a of n)a()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function wa(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=mn,document.head.append(n),e.effect(()=>()=>n.remove());let t=xa(),a=p=>e.sessions.list.getSnapshot().byId[p]?.cwd,d=p=>{hn.handler?.(p)},l=()=>e.locale.getSnapshot().active,u=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",f=()=>({copy:$e(l()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:p=>t.subscribe(p),scheme:u,statusLabel:pn,onListed:()=>{},setRenameHandler:p=>{hn.handler=p},setPref:(p,i)=>t.set({...t.get(),[p]:i})});e.effect(()=>e.sidebarRightTabs.register({id:ct,kind:ga,priority:"extension",keepMounted:!0,title:()=>$e(l()).typeLabel,guide:[{id:"explorer",order:10,title:()=>$e(l()).typeLabel,description:()=>$e(l()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:ct,inject:()=>({nxe:f()})},un)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:ct},function({useTabInfo:i}){let{tab:s}=i();return fe(ut.default.Fragment,null,fe(fn.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),s.title)})),"nano-explorer-extra: files tab title");let v=e.get("contextMenus");if(v!=null)for(let p of["file","directory"])e.effect(()=>v.register({id:`nano-explorer-extra.${p}`,target:p,order:900,resolve:async i=>{let s=$e(l()),b=i.sessionId===void 0?void 0:a(i.sessionId),w=b===void 0?i.path:ee(b,i.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:s.copyRelative,failureLabel:s.copyFailed,run:()=>ba(w)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:s.rename,failureLabel:s.renameFailed,run:()=>d?.({path:i.path,kind:p==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${p} menu`);e.slots.inject("contextMenu.icon",()=>{let p=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},va),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},ya)];return()=>{for(let i of p)i()}})}async function ba(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function va(){return fe("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},fe("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),fe("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))}function ya(){return fe("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},fe("path",{d:"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"}),fe("path",{d:"M13.5 6.5 17.5 10.5"}))}return Wn(ka);})();
		return __nxeExport;
	}
});
