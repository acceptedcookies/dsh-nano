window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var In=Object.create;var Ae=Object.defineProperty;var Fn=Object.getOwnPropertyDescriptor;var Mn=Object.getOwnPropertyNames;var Ln=Object.getPrototypeOf,Pn=Object.prototype.hasOwnProperty;var M=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var An=(e,n)=>{for(var t in n)Ae(e,t,{get:n[t],enumerable:!0})},kt=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let d of Mn(n))!Pn.call(e,d)&&d!==t&&Ae(e,d,{get:()=>n[d],enumerable:!(a=Fn(n,d))||a.enumerable});return e};var K=(e,n,t)=>(t=e!=null?In(Ln(e)):{},kt(n||!e||!e.__esModule?Ae(t,"default",{value:e,enumerable:!0}):t,e)),zn=e=>kt(Ae({},"__esModule",{value:!0}),e);var xa={};An(xa,{DEFAULT_PREFS:()=>Ee,apply:()=>ha,inject:()=>ca});var lt=K(M("react"),1);var x=K(M("react"),1);var Y=K(M("react"),1),nt=M("@deepseek-ai/dsh-client-ui-primitives");var pe=K(M("react"),1),Ce=M("@deepseek-ai/dsh-client-ui-primitives");function le({copy:e,title:n,description:t,confirmLabel:a,confirmDisabled:d,busy:u,error:c,danger:f,footer:v,maxHeight:m,width:i,region:s,onConfirm:b,onCancel:w,children:T}){return pe.default.createElement(Ce.Modal,{open:!0,onClose:w,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",m===void 0?"":"nano-dialog-capped",i===void 0?"":"nano-dialog-sized",s===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:v??pe.default.createElement(pe.default.Fragment,null,pe.default.createElement(Ce.Button,{variant:"outline",className:"nano-modal-action",onClick:w},e.cancel),pe.default.createElement(Ce.Button,{variant:f?"danger":"primary",className:"nano-modal-action",disabled:d===!0||u===!0,onClick:b},a??e.confirm))},T,c===void 0?null:pe.default.createElement("p",{className:"nano-dialog-error",role:"alert"},c))}var fe=K(M("react"),1),{useCallback:va,useEffect:Et,useRef:St,useState:Un}=fe.default;function Ze({menu:e,actions:n,onClose:t,width:a=208}){let d=St(null),[u,c]=Un(0),f=e===null?[]:n,v=f.length,m=St(f);m.current=f;let i=e===null?null:e.openedAt;if(Et(()=>{i!==null&&c(0)},[i]),Et(()=>{if(e===null)return;let T=O=>{d.current!==null&&!d.current.contains(O.target)&&t()},j=O=>{if(O.key==="Escape"){O.stopPropagation(),t();return}if(O.key==="ArrowDown"){O.preventDefault(),c(P=>(P+1)%v);return}if(O.key==="ArrowUp"){O.preventDefault(),c(P=>(P-1+v)%v);return}O.key==="Enter"&&(O.preventDefault(),t(),m.current[u]?.run())};return document.addEventListener("pointerdown",T,!0),document.addEventListener("keydown",j,!0),()=>{document.removeEventListener("pointerdown",T,!0),document.removeEventListener("keydown",j,!0)}},[e,u,v,t]),e===null||v===0)return null;let s=v*28+8,b=Math.min(e.x,(window.innerWidth||a)-a-8),w=Math.min(e.y,(window.innerHeight||s)-s-8);return fe.default.createElement("div",{className:"nano-menu",role:"menu",ref:d,style:{position:"fixed",left:`${Math.max(8,b)}px`,top:`${Math.max(8,w)}px`,minWidth:`${a}px`},"data-nano-menu":"true"},f.map((T,j)=>fe.default.createElement(Nt,{key:T.id,item:T,index:j,active:j===u,onHover:c,onRun:t})))}function Nt({item:e,index:n,active:t,onHover:a,onRun:d}){return fe.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>a(n),onClick:()=>{d(),e.run()}},e.icon===void 0?null:fe.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),fe.default.createElement("span",{className:"nano-menu-label"},e.label))}var $t=K(M("react"),1);function et({text:e}){return e==null?null:$t.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var tt=`
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
`;var{useState:Ct}=Y.default;function ze(e){return Ue(),Y.default.createElement(le,e)}function Ue(){Y.default.useEffect(()=>{let e=!0,n=()=>{if(!e)return;let a=document.querySelector("[data-nxe]")?.closest("[data-sidebar-right-pane]")??document.querySelector("[data-nxe]");if(!(a instanceof HTMLElement))return;let d=a.getBoundingClientRect();if(!(d.width<1||d.height<1))for(let u of document.querySelectorAll(".nano-dialog-card")){if(u.querySelector('[class*="nxe-"]')===null)continue;let c=u.parentElement;if(c instanceof HTMLElement&&(c.classList.add("nxe-confined-layer"),Object.assign(c.style,{position:"fixed",top:`${d.top}px`,left:`${d.left}px`,right:"auto",bottom:"auto",boxSizing:"border-box",width:`${d.width}px`,height:`${d.height}px`,padding:"12px"}),u.querySelector(".nxe-scm")!==null)){u.dataset.nxeFill="1";let f=a.getAttribute("data-theme");f&&u.setAttribute("data-theme",f),c.style.display="flex",c.style.flexDirection="column",c.style.justifyContent="flex-end",Object.assign(u.style,{width:"100%",maxWidth:"100%",height:"auto",maxHeight:"100%",minHeight:"0",minWidth:"0",margin:"0"})}}},t=new MutationObserver(n);return t.observe(document.body,{childList:!0}),window.addEventListener("resize",n),n(),()=>{e=!1,t.disconnect(),window.removeEventListener("resize",n);for(let a of document.querySelectorAll(".nxe-confined-layer")){a.classList.remove("nxe-confined-layer");for(let d of["position","top","left","right","bottom","width","height","padding","box-sizing","display","align-items","justify-content","flex-direction"])a.style.removeProperty(d)}for(let a of document.querySelectorAll("[data-nxe-fill]"))if(a instanceof HTMLElement){delete a.dataset.nxeFill;for(let d of["width","max-width","height","max-height","min-height","min-width","margin"])a.style.removeProperty(d)}}},[])}function Tt({children:e}){return Y.default.createElement("div",{className:"nxe-dialog-field"},e)}function Ot({copy:e,files:n,busy:t,error:a,onConfirm:d,onCancel:u}){let[c,f]=Ct(""),v=c.trim()==="";return Y.default.createElement(ze,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:v,busy:t,error:a,onConfirm:()=>d(c),onCancel:u,description:e.commitBody(n.length)},Y.default.createElement(Tt,null,Y.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(m=>Y.default.createElement("li",{key:m.path,title:m.path},`${m.status} ${m.path}`))),Y.default.createElement(nt.Input,{value:c,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:m=>f(m.currentTarget.value)})))}function at({copy:e,currentName:n,busy:t,error:a,onConfirm:d,onCancel:u,mode:c="rename"}){let[f,v]=Ct(n),m=f.trim()==="",i=c==="create";return Y.default.createElement(ze,{copy:e,title:i?e.newEntryTitle:e.renameTitle,confirmLabel:i?e.create:e.confirm,busy:t,error:a,confirmDisabled:m,onConfirm:()=>d(f),onCancel:u,description:i?e.newEntryBody(n):e.renameBody(n)},Y.default.createElement(Tt,null,Y.default.createElement(nt.Input,{value:f,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:s=>v(s.currentTarget.value),onKeyDown:s=>{s.key==="Enter"&&!m&&(s.preventDefault(),d(f))}})))}var l=K(M("react"),1),de=M("@deepseek-ai/dsh-client-ui-primitives");function Te(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,a=0;for(;t>=1024&&a<n.length-1;)t/=1024,a+=1;return`${a===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[a]}`}function Bt(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}function Rt(e){let n=[],t=[],a=[],d=[];for(let u of e??[]){if(u?.status==="U"){d.push(u);continue}if(u?.status==="?"){a.push(u);continue}u?.staged&&n.push({...u,status:u.staged}),u?.unstaged?t.push({...u,status:u.unstaged}):u?.staged||t.push(u)}return{staged:n,unstaged:t,untracked:a,conflicts:d}}function Dt(e){let n=typeof e=="string"?e:"",t=Math.max(n.lastIndexOf("/"),n.lastIndexOf("\\"));return t<=0?{name:n,dir:""}:{name:n.slice(t+1),dir:n.slice(0,t)}}function rt(e){let n=String(e??"").split(/[/\\]/u).filter(t=>t!=="");return n.length<=2?n.join("/"):`\u2026/${n.slice(-2).join("/")}`}function It(e,n=Date.now()){if(!Number.isFinite(e)||e<=0)return{unit:"unknown",value:""};let t=Math.floor(Math.max(0,n-e*1e3)/6e4);if(t<1)return{unit:"now",value:0};if(t<60)return{unit:"minutes",value:t};let a=Math.floor(t/60);if(a<24)return{unit:"hours",value:a};let d=Math.floor(a/24);if(d<30)return{unit:"days",value:d};let u=new Date(e*1e3),c=f=>String(f).padStart(2,"0");return{unit:"date",value:`${u.getFullYear()}-${c(u.getMonth()+1)}-${c(u.getDate())}`}}var{useEffect:Gn,useState:Mt}=l.default;function Hn(e,n){let t=It(n);return t.unit==="now"?e.ageJustNow:t.unit==="minutes"?e.ageMinutes(t.value):t.unit==="hours"?e.ageHours(t.value):t.unit==="days"?e.ageDays(t.value):t.unit==="date"?t.value:""}function Lt(e){return e?.detached===!0?null:typeof e?.branch=="string"&&e.branch!==""?e.branch:null}function Ft(e,n){let t=e.trim().toLowerCase();return t===""?!0:n.some(a=>String(a??"").toLowerCase().includes(t))}function jn({file:e}){let{name:n,dir:t}=Dt(e.path);return l.default.createElement("li",{className:"nxe-change","data-status":e.status,title:e.path},l.default.createElement("span",{className:"nxe-change-status","data-status":e.status},e.status),l.default.createElement("span",{className:"nxe-change-name"},n,t===""?null:l.default.createElement("span",{className:"nxe-change-dir"},t)))}function ot({heading:e,files:n,tone:t}){return n.length===0?null:l.default.createElement("section",{className:"nxe-scm-group","data-tone":t??"default"},l.default.createElement("h3",{className:"nxe-drawer-heading"},e),l.default.createElement("ul",{className:"nxe-drawer-list"},n.slice(0,400).map(a=>l.default.createElement(jn,{key:`${t??""}:${a.path}`,file:a}))))}function Pt({copy:e,history:n,currentBranch:t}){let a=n??[];return l.default.createElement("section",{className:"nxe-scm-group","data-nxe-history":"true"},l.default.createElement("h3",{className:"nxe-drawer-heading"},e.historyHeading),a.length===0?l.default.createElement("p",{className:"nxe-drawer-empty"},e.historyEmpty):l.default.createElement("ol",{className:"nxe-graph"},a.map((d,u)=>l.default.createElement("li",{key:`${d.hash}:${u}`,className:"nxe-graph-row","data-head":String(u===0),title:[d.hash,Hn(e,d.time),d.subject].filter(c=>c!=="").join(" \xB7 ")},l.default.createElement("span",{className:"nxe-graph-rail","aria-hidden":"true"},l.default.createElement("span",{className:"nxe-graph-dot"})),l.default.createElement("span",{className:"nxe-graph-subject"},l.default.createElement("span",{className:"nxe-graph-hash"},d.hash)," ",d.subject),l.default.createElement("span",{className:"nxe-graph-pills"},d.refs.slice(0,2).map(c=>l.default.createElement("span",{key:c,className:"nxe-pill","data-tone":c===t?"current":"default",title:c},c)))))))}function At({copy:e,open:n,git:t,onClose:a,onPull:d,onRefresh:u,onCheckout:c,busy:f,error:v}){Ue();let[m,i]=Mt("");if(Gn(()=>{n||i("")},[n]),!n)return null;let s=Lt(t),b=t?.upstream??null,w=t?.behind??0,T=t?.ahead??0,j=t?.history??[],O=[...t?.branches??[]].sort((g,$)=>g.current===!0&&$.current!==!0?-1:$.current===!0&&g.current!==!0?1:g.name.localeCompare($.name)).filter(g=>Ft(m,[g.name,g.upstream,g.commit])),P=(t?.worktrees??[]).filter(g=>Ft(m,[g.branch,g.path,g.head,rt(g.path)])),ne=m.trim()!==""&&O.length===0&&P.length===0;return l.default.createElement(le,{copy:e,title:e.branchDrawerTitle,description:e.branchDrawerSummary(s??e.detached,b===null?e.noUpstream:`${b} \xB7 ${e.factSyncValue(w,T)}`,(t?.files?.length??0)===0?e.factClean:e.factDirty(t?.files?.length??0)),error:v,footer:l.default.createElement(l.default.Fragment,null,l.default.createElement(de.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{u()}},e.refreshGit),b===null?null:l.default.createElement(de.Button,{variant:"primary",className:"nano-modal-action",disabled:f===!0||w===0,title:w===0?e.pullNothing:e.pullNow,onClick:()=>{d()}},w>0?`${e.pullNow} ${w}`:e.pullNow)),onCancel:a},l.default.createElement("div",{className:"nxe-scm","data-nxe-scm":"branch"},l.default.createElement(de.Input,{value:m,placeholder:e.branchFilter,"aria-label":e.branchFilter,"data-nxe-branch-filter":"true",onChange:g=>i(g.currentTarget.value)}),ne?l.default.createElement("p",{className:"nxe-drawer-empty"},e.branchFilterEmpty):l.default.createElement(l.default.Fragment,null,l.default.createElement("h3",{className:"nxe-drawer-heading"},e.branchesHeadingCount(O.length)),O.length===0?l.default.createElement("p",{className:"nxe-drawer-empty"},e.branchesEmpty):l.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-branches":"true"},O.map(g=>l.default.createElement("li",{key:g.name,className:"nxe-drawer-row","data-current":String(g.current===!0),"data-blocked":String(g.inOtherWorktree===!0)},l.default.createElement("button",{type:"button",className:"nxe-drawer-branch",disabled:g.current===!0||g.inOtherWorktree===!0||f===!0,title:g.inOtherWorktree===!0?e.branchHeldElsewhere:g.name,onClick:()=>{c(g.name)},"data-nxe-checkout":g.name},g.name),g.commit===""?null:l.default.createElement("span",{className:"nxe-graph-hash"},g.commit),g.upstream===null?null:l.default.createElement("span",{className:"nxe-drawer-row-path",title:g.upstream},g.upstream),g.inOtherWorktree===!0?l.default.createElement("span",{className:"nxe-drawer-row-badge"},e.branchHeldShort):g.current===!0?l.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null))),l.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeadingCount(P.length)),P.length===0?l.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):l.default.createElement("ul",{className:"nxe-drawer-list","data-nxe-worktrees":"true"},P.map(g=>{let $=g.path===t?.root,ae=g.detached?e.detached:g.branch??e.detached,_=typeof g.head=="string"?g.head.slice(0,7):"";return l.default.createElement("li",{key:g.path,className:"nxe-worktree","data-current":String($),title:g.path},l.default.createElement("span",{className:"nxe-worktree-mark","data-current":String($),"aria-hidden":"true"}),l.default.createElement("span",{className:"nxe-worktree-body"},l.default.createElement("span",{className:"nxe-worktree-line"},l.default.createElement("span",{className:"nxe-worktree-branch"},ae),_===""?null:l.default.createElement("span",{className:"nxe-graph-hash"},_),$?l.default.createElement("span",{className:"nxe-drawer-row-badge","data-tone":"current"},e.branchCurrentShort):null),l.default.createElement("span",{className:"nxe-worktree-path"},rt(g.path))))})),l.default.createElement(Pt,{copy:e,history:j,currentBranch:s}))))}function zt({copy:e,open:n,git:t,onClose:a,onCommit:d,onPull:u,busy:c,error:f,onOpenConflict:v}){Ue();let[m,i]=Mt("");if(!n)return null;let s=t?.files??[],b=Rt(s),w=b.conflicts.length>0?b.conflicts:(t?.conflicts??[]).map($=>({path:$,status:"U"})),T=s.length,j=t?.upstream??null,O=t?.behind??0,P=Lt(t),ne=T>0&&w.length===0&&m.trim()!==""&&c!==!0,g=()=>{ne&&Promise.resolve(d(m)).then($=>{$===!0&&i("")})};return l.default.createElement(le,{copy:e,title:e.commitDrawerTitle,description:e.commitDrawerBody(T,P??(t?.detached?e.detached:null)),error:f,footer:l.default.createElement(l.default.Fragment,null,j===null?null:l.default.createElement(de.Button,{variant:"outline",className:"nano-modal-action",disabled:c===!0||O===0,title:O===0?e.pullNothing:e.pullNow,onClick:()=>{u()}},O>0?`${e.pullNow} ${O}`:e.pullNow),l.default.createElement(de.Button,{variant:"primary",className:"nano-modal-action",disabled:!ne,onClick:g},e.commit)),onCancel:a},l.default.createElement("div",{className:"nxe-scm","data-nxe-scm":"commit"},l.default.createElement(de.Input,{value:m,placeholder:P===null?e.commitPlaceholder:e.commitPlaceholderOn(P),"aria-label":e.commitMessageLabel,"data-modal-autofocus":!0,"data-nxe-commit-message":"true",onChange:$=>i($.currentTarget.value),onKeyDown:$=>{$.key==="Enter"&&($.metaKey||$.ctrlKey)&&($.preventDefault(),g())}}),l.default.createElement("p",{className:"nxe-scm-counts"},l.default.createElement("span",{className:"nxe-scm-count"},e.countStaged(b.staged.length)),l.default.createElement("span",{className:"nxe-scm-count"},e.countUnstaged(b.unstaged.length)),l.default.createElement("span",{className:"nxe-scm-count"},e.countUntracked(b.untracked.length)),w.length===0?null:l.default.createElement("span",{className:"nxe-scm-count","data-tone":"danger"},e.countConflict(w.length))),l.default.createElement(Pt,{copy:e,history:t?.history,currentBranch:P}),w.length===0?null:l.default.createElement("section",{className:"nxe-scm-group","data-tone":"danger"},l.default.createElement("h3",{className:"nxe-drawer-heading"},e.conflictsHeading(w.length)),l.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),l.default.createElement("ul",{className:"nxe-drawer-list"},w.map($=>l.default.createElement("li",{key:$.path,className:"nxe-change","data-status":"U"},l.default.createElement("span",{className:"nxe-change-status","data-status":"U"},"U"),l.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:$.path,onClick:()=>v($.path)},$.path))))),T===0?l.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):l.default.createElement(l.default.Fragment,null,l.default.createElement(ot,{heading:e.groupStaged(b.staged.length),files:b.staged,tone:"staged"}),l.default.createElement(ot,{heading:e.groupUnstaged(b.unstaged.length),files:b.unstaged,tone:"unstaged"}),l.default.createElement(ot,{heading:e.groupUntracked(b.untracked.length),files:b.untracked,tone:"untracked"}))))}var z=K(M("react"),1),Kt=M("@deepseek-ai/dsh-client-ui-primitives");var Gt="dsh-nano-explorer-extra:prefs.v2",Wn="dsh-nano-explorer-extra:prefs.v1",Ee={openPreviewOnClick:!0,openPreviewOnDoubleClick:!1,showOpenButton:!0,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0,showSystemFiles:!1};function Ht(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ut(e){let n=Ht(e)?e:{},t={};for(let[a,d]of Object.entries(Ee))t[a]=typeof n[a]=="boolean"?n[a]:d;return t}function jt(){try{let e=window.localStorage?.getItem(Gt);if(e!=null)return Ut(JSON.parse(e));let n=window.localStorage?.getItem(Wn);if(n==null)return{...Ee};let t=JSON.parse(n),a=Ht(t)?{...t}:{};return delete a.openPreviewOnClick,delete a.openPreviewOnDoubleClick,Ut(a)}catch{return{...Ee}}}function Wt(e){try{window.localStorage?.setItem(Gt,JSON.stringify(e))}catch{}}function ce({label:e,hint:n,checked:t,onChange:a,warn:d}){return z.default.createElement("div",{className:"nxe-settings-row"},z.default.createElement("div",null,z.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:z.default.createElement("div",{className:"nxe-settings-hint"},n),d===!0?z.default.createElement("p",{className:"nxe-warn"},n):null),z.default.createElement(Kt.Switch,{checked:t,label:e,onChange:a}))}function _t({copy:e,open:n,prefs:t,setPref:a,onClose:d}){if(!n)return null;let u=t.openPreviewOnClick===!1&&t.openPreviewOnDoubleClick===!1;return z.default.createElement(le,{copy:e,title:e.settingsTitle,description:e.settingsDescription,maxHeight:520,onCancel:d},z.default.createElement(ce,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:t.openPreviewOnClick,onChange:c=>a("openPreviewOnClick",c)}),z.default.createElement(ce,{label:e.settingsOpenOnDoubleClick,checked:t.openPreviewOnDoubleClick,onChange:c=>a("openPreviewOnDoubleClick",c)}),u?z.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,z.default.createElement(ce,{label:e.settingsShowOpenButton,checked:t.showOpenButton,onChange:c=>a("showOpenButton",c)}),z.default.createElement(ce,{label:e.settingsShowIgnoredBadge,checked:t.showIgnoredBadge,onChange:c=>a("showIgnoredBadge",c)}),z.default.createElement(ce,{label:e.settingsShowGit,checked:t.showGitStatus,onChange:c=>a("showGitStatus",c)}),z.default.createElement(ce,{label:e.settingsShowSystemFiles,hint:e.settingsShowSystemFilesHint,checked:t.showSystemFiles,onChange:c=>a("showSystemFiles",c)}),z.default.createElement(ce,{label:e.settingsShowStatusBar,checked:t.showStatusBar,onChange:c=>a("showStatusBar",c)}),z.default.createElement(ce,{label:e.settingsStatsExcludeGit,checked:t.statsExcludeGit,onChange:c=>a("statsExcludeGit",c)}))}var G=K(M("react"),1);function qt(e){return function({entry:t}){let a=e.copy(),d=e.statusOf(t.path),u=e.ignoredOf(t.path),c=e.linkOf(t.path),f=e.linkBrokenOf(t.path)===!0,v=t.meta?.kind!=="directory",m=v?void 0:e.folderStatusOf(t.path),i=e.showGit()&&!u,s=i?e.stagedOf(t.path):void 0,b=i?e.unstagedOf(t.path):void 0,w=i?e.remoteOf(t.path):void 0;return G.default.createElement("span",{className:"nxe-acc",...u?{"data-nxe-ignored":"true"}:{}},c===void 0?null:G.default.createElement("span",{className:"nxe-acc-link",title:f?a.linkBroken:c?a.symlinkOutsideBadge:a.symlinkBadge,"aria-label":f?a.linkBroken:c?a.symlinkOutsideBadge:a.symlinkBadge,"data-nxe-symlink":f?"broken":c?"outside":"inside"},G.default.createElement("svg",{viewBox:"0 0 24 24",width:11,height:11,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round","aria-hidden":"true"},G.default.createElement("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),G.default.createElement("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}),f?G.default.createElement("path",{d:"M3 3l18 18"}):null)),w===void 0?null:G.default.createElement("span",{className:"nxe-acc-remote","data-status":w.status,"data-direction":w.direction,title:w.direction==="pulled"?a.remotePulled(w.status):a.remotePushed(w.status),"aria-label":w.direction==="pulled"?a.remotePulled(w.status):a.remotePushed(w.status)},`${w.direction==="pulled"?"\u2193":"\u2191"}${w.status}`),i&&d!==void 0?G.default.createElement("span",{className:"nxe-acc-letter","data-status":d,"data-staged":s===void 0?"false":"true",title:e.statusLabel(d,s,b),"aria-label":e.statusLabel(d,s,b)},d):null,i&&m!==void 0?G.default.createElement("span",{className:"nxe-acc-dot","data-status":m,title:e.statusLabel(m),"aria-label":e.statusLabel(m)}):null,u?G.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"ignored",title:a.ignoredBadge,"aria-label":a.ignoredBadge},"\u2298"):null,v&&e.showOpenButton()?G.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:a.openFile,"aria-label":`${a.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:T=>{T.stopPropagation(),e.open(t)}},G.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},G.default.createElement("path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}),G.default.createElement("path",{d:"M15 3h6v6"}),G.default.createElement("path",{d:"M10 14 21 3"}))):null)}}var N=K(M("react"),1);var H=M("@deepseek-ai/dsh-client-ui-primitives");function it({icon:e,value:n,title:t,scope:a}){return N.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":a},e,N.default.createElement("span",{className:"nxe-figure-value"},n))}function Yt(e){let{copy:n,git:t,stats:a,statsState:d,prefs:u,onOpenBranch:c,onOpenCommit:f}=e;if(!u.showStatusBar)return null;let v=[];if(t==null)v.push(N.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},N.default.createElement(H.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),N.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let i=t.detached?n.detached:t.branch??n.detached,s=t.files?.length??0,b=t.conflicts?.length??0,w=s>0;v.push(N.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(w),"data-conflicted":String(b>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(i,w,b),"aria-label":n.branchButtonTooltip(i,w,b),onClick:c},N.default.createElement(H.IconBranchOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},i),w?N.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,b>0?N.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&v.push(N.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},N.default.createElement(H.IconArchiveOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let T=t.upstream===null||t.upstream===void 0?void 0:Bt(t.ahead??0,t.behind??0);v.push(N.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(s),title:n.commitButtonTooltip(s,T===void 0?null:T),"aria-label":n.commitButtonTooltip(s,T===void 0?null:T),onClick:f},N.default.createElement(H.IconRefreshOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-chip-count","data-nxe-pending":String(s)},String(s)),T===void 0?null:N.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},T)))}let m=[];if(d==="loading")m.push(N.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(d==="failed")m.push(N.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(a!=null){let i=a.truncated?"+":"",s=u.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";m.push(N.default.createElement(it,{key:"dirs",scope:"directories",icon:N.default.createElement(H.IconFolderCloseRegular,{width:14,height:14}),value:`${a.directories}${i}`,title:n.statsTooltip(a.files,a.directories,Te(a.bytes))+s})),m.push(N.default.createElement(it,{key:"files",scope:"files",icon:N.default.createElement(H.IconDeliverDocRegular,{width:14,height:14}),value:`${a.files}${i}`,title:n.statsTooltip(a.files,a.directories,Te(a.bytes))+s})),m.push(N.default.createElement(it,{key:"bytes",scope:"bytes",icon:N.default.createElement(H.IconGaugeOutlineRegular,{width:14,height:14}),value:Te(a.bytes),title:n.statsSizeTooltip(Te(a.bytes))+s}))}return m.push(N.default.createElement("button",{key:"settings",type:"button",className:"nxe-gear","data-nxe-settings-button":"true",title:n.settingsTitle,"aria-label":n.settingsTitle,onClick:e.onOpenSettings},N.default.createElement(H.IconSettingsOutlineRegular,{width:14,height:14}))),N.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},N.default.createElement("div",{className:"nxe-status-left"},v),N.default.createElement("div",{className:"nxe-status-right"},m))}var Jt=K(M("react"),1);function Vt({menu:e,actions:n,onClose:t}){return Jt.default.createElement(Ze,{menu:e,actions:n,onClose:t})}var U=K(M("@deepseek-ai/dsh-client-ui-primitives"),1);var Zt=K(M("react"),1);function ue(e,n){let t=re(e),a=String(n??"").replace(/\\/gu,"/");return a===""?t:a.startsWith("/")||/^[A-Za-z]:\//u.test(a)?re(a):`${t==="/"?"":t}/${a}`.replace(/\/{2,}/gu,"/")}function J(e,n){return re(ue(e,n))}function Kn(e,n){let t=re(e),a=re(n);return t===a?!0:a.startsWith(t==="/"?"/":`${t}/`)}function ee(e,n){let t=re(e),a=re(n);return a===t?"":Kn(t,a)?a.slice(t==="/"?1:t.length+1):a}function Ge(e){let n=re(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Oe(e){let n=re(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function re(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:ge,useEffect:Xt,useMemo:Qt,useRef:Be,useState:Re}=Zt.default;function en(e){let{sessionId:n,root:t,request:a,prefs:d,onListed:u}=e,[c,f]=Re(()=>new Map),[v,m]=Re(()=>new Set),i=Be(v);i.current=v;let[s,b]=Re(null),[w,T]=Re(null),[j,O]=Re(0),P=Be(!0),ne=Be(u);ne.current=u,Xt(()=>()=>{P.current=!1},[]);let g=ge(async(E,B=!1)=>{let S=J(t,E);B||f(I=>{let C=new Map(I);return C.get(S)===void 0&&C.set(S,{loading:!0,entries:[]}),C});let k=await a("/list",{sessionId:n,path:E});if(P.current)return f(I=>{let C=new Map(I),oe=C.get(S);return k.ok?C.set(S,{entries:k.entries,truncated:k.truncated===!0,outside:k.outside===!0,failed:oe?.failed===!0&&oe.entries?.length>0?oe.failed:!1}):C.set(S,{entries:oe?.entries??[],failed:!0,message:k.message,code:k.code}),C}),ne.current?.(E,k.ok?k.entries.map(I=>I.name):[]),k},[t,n,a]),$=Be(void 0),ae=Be([]);Xt(()=>{if(t!==void 0){if($.current!==t){$.current=t,f(new Map),m(new Set),g(t);return}g(t,!0);for(let E of ae.current)g(E,!0)}},[t,j,g]);let _=ge(async()=>{ae.current=[...i.current],O(E=>E+1)},[]),xe=ge(E=>g(E,!0),[g]),te=ge((E,B)=>{let S=J(t,E);m(k=>{let I=new Set(k);return B?I.add(S):I.delete(S),I}),B&&c.get(S)===void 0&&g(E)},[t,c,g]),Fe=ge(E=>{let B=J(t,E);f(S=>{if(S.has(B))return S;let k=new Map(S);return k.set(B,{entries:[]}),k})},[t]),V=ge(E=>{let B=J(t,E);f(S=>{if(!S.has(B))return S;let k=new Map(S);return k.delete(B),k})},[t]),Me=ge(E=>{let B=J(t,E);m(S=>{let k=new Set;for(let I of S)I!==B&&!I.startsWith(`${B}/`)&&k.add(I);return k}),f(S=>{let k=new Map;for(let[I,C]of S)I!==B&&!I.startsWith(`${B}/`)&&k.set(I,C);return k})},[t]),W=Qt(()=>{let E=[];for(let[B,S]of c)for(let k of S.entries??[]){let I=B===""?k.name:`${B}/${k.name}`;E.push({...k,path:I})}return E},[c]),We=Qt(()=>{let E={};for(let[B,S]of c)S.loading===!0&&(S.entries?.length??0)===0?E[B]={loading:!0}:S.failed===!0?E[B]={failure:S.message}:S.truncated===!0&&(E[B]={truncated:!0});return E},[c]);return{levels:c,entries:W,directories:We,expanded:[...v],selected:s,setSelected:b,toggle:te,pending:w,setPending:T,refresh:_,refreshLevel:xe,loadLevel:g,forget:V,collapseUnder:Me,knownEmpty:Fe}}var _n=".md";function tn(e,n){let t=e==="file"?"untitled":"new-folder",a=new Set((n??[]).map(u=>String(u.name??"").toLowerCase())),d=u=>e==="file"?`${t}${u===1?"":`-${u}`}${_n}`:`${t}${u===1?"":`-${u}`}`;for(let u=1;u<1e4;u+=1){let c=d(u);if(!a.has(c.toLowerCase()))return c}throw new Error("cannot find an unused name")}function nn(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:R,useEffect:De,useMemo:me,useRef:Ie,useState:L,useSyncExternalStore:qn}=x.default,Yn=400,Jn=["U","D","M","A","R","?"],Vn=new Set([".git",".DS_Store"]);function an(e){return e.split("/").map(n=>encodeURIComponent(n).replace(/%3A/giu,":")).join("/")}function rn(e){let{useTabInfo:n,sessionId:t,useSessions:a,renderSlot:d,renderFactorySlot:u,useContextMenu:c,nxe:f}=e,{tab:v,panel:m}=n(),i=a(r=>r.byId[t]?.cwd),s=f.copy,b=qn(f.subscribePrefs,f.getPrefs,f.getPrefs),[w,T]=L(null),[j,O]=L(void 0),[P,ne]=L(null),[g,$]=L("idle"),[ae,_]=L(null),[xe,te]=L(!1),[Fe,V]=L(void 0),[Me,W]=L(void 0),[We,E]=L(void 0),[B,S]=L([]);De(()=>{let r=!0;return(async()=>{try{let o=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!o.ok)return;let h=await o.json(),y=Array.isArray(h.apps)?h.apps:[];r&&S(y.filter(F=>typeof F=="string"))}catch{}})(),()=>{r=!1}},[]);let[k,I]=L(null),[C,oe]=L(null),[Le,Ke]=L(null),[dt,Ne]=L(null),[cn,ct]=L(!1),[ut,we]=L(!1),[mt,ie]=L(void 0),$e=Ie(0),[_e,un]=L(()=>new Map),ht=Ie({path:"",at:0}),be=Ie(b);be.current=b;let D=R(async(r,o)=>{try{let h=await fetch(`/nano-explorer-extra${r}`,{method:o===void 0?"GET":"POST",headers:o===void 0?void 0:{"content-type":"application/json"},body:o===void 0?void 0:JSON.stringify(o),credentials:"same-origin",cache:"no-store"}),y=await h.json().catch(()=>({error:`HTTP ${h.status}`}));return h.ok?{ok:!0,...y}:{ok:!1,message:y?.error??`HTTP ${h.status}`}}catch(h){return{ok:!1,message:h instanceof Error?h.message:String(h)}}},[]),mn=R(async(r,o)=>{if(!be.current.showGitStatus||!Array.isArray(o)||o.length===0)return;let h=await D("/ignored",{sessionId:t,paths:o});!h.ok||!Array.isArray(h.ignored)||h.ignored.length===0||pn(y=>{let F=new Set(y),A=ee(i??"",r);for(let Z of h.ignored)F.add(A===""?Z:`${A}/${Z}`);return F})},[D,t,i]),p=en({sessionId:t,root:i,request:D,prefs:b,onListed:(r,o)=>{mn(r,o)}}),X=R(async()=>{if(i===void 0)return;if(!be.current.showGitStatus){T(null),O(void 0);return}let r=await D(`/status?sessionId=${encodeURIComponent(t)}`);if(!r.ok){O(r.message);return}T(r.git??null),O(r.gitError)},[i,t,D]),q=R(async()=>{if(i===void 0)return;$("loading");let r=await D(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!r.ok){$("failed");return}ne(r.stats??null),$("ok")},[i,t,D]);De(()=>{X()},[X]),De(()=>{q()},[i]);let qe=Ie(0),ve=R(()=>{window.clearTimeout(qe.current),qe.current=window.setTimeout(()=>{q()},2e3)},[q]);De(()=>()=>{window.clearTimeout(qe.current),window.clearTimeout($e.current)},[]);let hn=me(()=>{let r=new Map;for(let o of p.entries)o.symlink===!0&&r.set(o.path,{outside:o.outside===!0});return r},[p.entries]),Ye=me(()=>Array.isArray(w?.files)?w.files:[],[w]),Je=me(()=>{let r=new Map;for(let o of Ye)r.set(o.path,o);return r},[Ye]),[Ve,pn]=L(()=>new Set),ye=w?.root,pt=Ie(ye);pt.current=ye;let se=me(()=>{if(_e.size===0)return Je;let r=new Map(Je);for(let[o,h]of _e)r.set(o,h);return r},[Je,_e]),Q=R(r=>{if(ye==null)return;let o=ue(i??"",r);return ee(ye,o)},[ye,i]),Xe=R(r=>{let o=Q(r);if(o===void 0)return!1;if(Ve.has(o))return!0;let h=o.split("/");for(let y=h.length-1;y>0;y-=1)if(Ve.has(h.slice(0,y).join("/")))return!0;return!1},[Ve,Q]),ft=R(r=>{let o=Q(r);if(o!==void 0)return se.get(o)?.status},[se,Q]),fn=R(r=>{let o=Q(r);if(o!==void 0)return se.get(o)?.staged},[se,Q]),gn=R(r=>{let o=Q(r);if(o!==void 0)return se.get(o)?.unstaged},[se,Q]),gt=me(()=>{let r=new Map;for(let o of w?.remote?.pushed??[])r.set(o.path,{status:o.status,direction:"pushed"});for(let o of w?.remote?.pulled??[])r.set(o.path,{status:o.status,direction:"pulled"});return r},[w]),xn=R(r=>{let o=Q(r);if(o!==void 0)return gt.get(o)},[gt,Q]),ke=R(r=>{let o=ue(i??"",r.path),h=i??"",y=ee(h,o),A=h!==""&&y!==o?`dsh-resource://file/session/${encodeURIComponent(t)}/${an(y)}`:`dsh-resource://file/absolute/${an(o.replace(/^\/+/,""))}`;m.isFloating?v.actions.openResource(A):v.actions.openResource(A,{paneId:m.id})},[i,t,v.actions,m.id,m.isFloating]),xt=R(async r=>{if(i===void 0||!be.current.showGitStatus)return;let o=await D(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(r)}`);if(!o.ok||o.git===null||o.git===void 0)return;let h=o.git.root;un(y=>{let F=new Map(y);for(let A of o.git.files??[]){let Z=h===void 0?A.path:`${h.replace(/\/+$/u,"")}/${A.path}`,Pe=pt.current??i,yt=ee(Pe,Z);yt!==Z&&F.set(yt,A)}return F})},[i,t,D]),wn=R(async r=>{let o=await p.loadLevel(r.path);p.toggle(r.path,!0),o?.ok&&xt(r.path)},[p,xt]),bn=R(async r=>{te(!0);let o=await D("/delete",{sessionId:t,path:r.path,kind:r.kind==="directory"?"directory":"file"});if(te(!1),!o.ok){W(o.message);return}Ke(null),W(void 0),p.forget(r.path),p.collapseUnder(r.path);let h=Ge(r.path);h!==r.path&&await p.refreshLevel(h),p.selected===r.path&&p.setSelected(null),ve()},[t,D,p,ve]),wt=R(r=>{if(i===void 0)return;let o=Xn(p,i),h=Qn(p,i,o);W(void 0),I({kind:r,directory:o,proposed:tn(r,h)})},[i,p]),vn=R(async r=>{if(k===null)return;let{kind:o,directory:h}=k,y=nn(r,s);if(!y.ok){W(y.message);return}te(!0);let F=await D(o==="file"?"/create-file":"/create-folder",{sessionId:t,directory:h,name:y.name});if(te(!1),!F.ok){W(F.message);return}I(null),W(void 0),await p.refreshLevel(h);let A=ee(i??"",h),Z=ue(i??"",`${A===""?"":`${A}/`}${y.name}`);p.setSelected(Z),o==="folder"&&(p.knownEmpty(Z),p.toggle(Z,!0)),ve()},[k,s,i,t,D,p,ve]),yn=R(async(r,o)=>{if(i===void 0)return;let h=ue(i,r.path),y=r.meta?.kind==="directory"?"directory":"file";te(!0),V(void 0);let F=await D("/rename",{sessionId:t,path:h,name:o,kind:y});if(te(!1),!F.ok){V(F.message);return}_(null);let A=Ge(h);await p.refreshLevel(A),y==="directory"&&p.collapseUnder(h),p.setSelected(ue(i,`${ee(i,A)===""?"":`${ee(i,A)}/`}${o.trim()}`)),ve()},[i,t,D,p,ve]),kn=R(async r=>{te(!0),V(void 0);let o=await D("/commit",{sessionId:t,message:r});if(te(!1),!o.ok){V(o.message);return}_(null),await p.refresh(),await X(),await q()},[t,D,p,X,q]),bt=R(async()=>{we(!0),ie(void 0);let r=await D("/pull",{sessionId:t});if(we(!1),!r.ok){ie(r.message);return}await p.refresh(),await X(),await q()},[t,D,p,X,q]),En=R(async r=>{we(!0),ie(void 0);let o=await D("/checkout",{sessionId:t,branch:r});if(we(!1),!o.ok){ie(o.message);return}E(s.branchSwitched(r)),window.clearTimeout($e.current),$e.current=window.setTimeout(()=>E(void 0),2e3),await p.refresh(),await X(),await q()},[t,D,p,X,q,s]),Sn=R(async r=>{we(!0),ie(void 0);let o=await D("/commit",{sessionId:t,message:r});return we(!1),o.ok?(await p.refresh(),await X(),await q(),!0):(ie(o.message),!1)},[t,D,p,X,q]),Qe=R(async(r,o)=>{try{await navigator.clipboard.writeText(o||r),E(s.copied),window.clearTimeout($e.current),$e.current=window.setTimeout(()=>E(void 0),1600)}catch(h){W(h instanceof Error?h.message:String(h))}},[s.copied]),Nn=R((r,o)=>({onContextMenu:h=>{h.preventDefault(),h.stopPropagation(),p.setSelected(r.path),oe({x:h.clientX,y:h.clientY,path:r.path,name:r.name,kind:o,openedAt:Date.now()})}}),[p]),$n=R(r=>{let o=Q(r);if(o===void 0)return;let h=o===""?"":`${o}/`,y,F=-1;for(let[A,Z]of se){if(h!==""&&!A.startsWith(h))continue;let Pe=Jn.indexOf(Z.status);Pe>F&&(F=Pe,y=Z.status)}return y},[se,Q]),vt=me(()=>qt({copy:()=>s,statusOf:ft,stagedOf:fn,unstagedOf:gn,remoteOf:xn,ignoredOf:Xe,folderStatusOf:$n,linkBrokenOf:r=>p.levels.get(J(i??"",r))?.code==="broken-link",linkOf:r=>{let o=hn.get(r);if(o!==void 0)return o.outside===!0},showGit:()=>b.showGitStatus,showIgnoredBadge:()=>b.showIgnoredBadge,showOpenButton:()=>b.showOpenButton,statusLabel:r=>f.statusLabel(s,r),open:r=>ke(r)}),[s,ft,Xe,p.levels,i,b.showGitStatus,b.showIgnoredBadge,b.showOpenButton,f,ke]),Cn=me(()=>({slots:{accessory:vt},fallback:null}),[vt]);if(i===void 0)return x.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},s.noWorkspace);let Tn=p.entries.filter(r=>b.showSystemFiles||!Vn.has(r.name)).map(r=>({path:r.path,name:r.name,meta:{kind:r.type==="directory"?"directory":r.type==="file"?"file":"other",...r.symlink===!0?{link:!0}:{},...r.outside===!0?{outside:!0}:{},...Xe(r.path)?{hidden:!0}:{}}})),On=u("sidebar.files.tree",{root:J(i,i),entries:Tn,expanded:p.expanded,directories:p.directories,current:p.selected===null?void 0:J(i,p.selected),onToggle:r=>{if(p.expanded.includes(r.path)){p.toggle(r.path,!1);return}wn(r)},onOpen:r=>{p.setSelected(r.path);let o=Date.now(),h=ht.current,y=h.path===r.path&&o-h.at<=Yn;ht.current={path:r.path,at:o},(y?be.current.openPreviewOnDoubleClick:be.current.openPreviewOnClick)&&ke(r)},rowTriggerProps:Nn,canOpen:()=>!0},Cn);De(()=>{let r=o=>{V(void 0),_({kind:"rename",entry:{path:o.path,name:Oe(o.path),meta:{kind:o.kind}}})};return f.setRenameHandler(r),()=>f.setRenameHandler(void 0)},[f]);let Bn=R(r=>{if(p.pending!==null)return;if(r.key==="F2"&&p.selected!==null){r.preventDefault(),V(void 0),_({kind:"rename",entry:{path:p.selected,name:Oe(p.selected),meta:{kind:p.levels.has(p.selected)?"directory":"file"}}});return}let o=p.selected;if(o===null)return;let h=J(i??"",o),y=p.levels.has(h)||p.expanded.includes(h);if(r.key===" "){if(!y)return;r.preventDefault(),p.toggle(o,!p.expanded.includes(h));return}if(r.key==="Enter"){if(r.preventDefault(),y){p.toggle(o,!p.expanded.includes(h));return}ke({path:h,name:Oe(o),meta:{kind:"file"}})}},[p,i,ke]),Rn=ae===null?null:ae.kind==="commit"?x.default.createElement(Ot,{copy:s,files:Ye,busy:xe,error:Fe,onConfirm:kn,onCancel:()=>{_(null),V(void 0)}}):x.default.createElement(at,{copy:s,currentName:ae.entry.name,busy:xe,error:Fe,onConfirm:r=>yn(ae.entry,r),onCancel:()=>{_(null),V(void 0)}}),Dn=me(()=>{if(C===null)return[];let r={path:C.path,name:C.name,kind:C.kind},o=B[0],h=y=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:y,path:C.path}),credentials:"same-origin"})};return[o===void 0?null:{id:"reveal",label:s.revealIn(je[o]??o),icon:x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14}),run:()=>{h(o)}},{id:"copy-path",label:s.copyAbsolute,icon:x.default.createElement(U.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{Qe(C.path,C.path)}},{id:"copy-relative",label:s.copyRelative,icon:x.default.createElement(U.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{Qe(C.path,ee(i??"",C.path))}},C.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:s.openInNotepad,icon:x.default.createElement(U.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let y=await D("/read",{sessionId:t,path:C.path});if(!y.ok){W(y.message??s.openInNotepadFail);return}W(void 0);let F=C.path.startsWith("/")?C.path:`${i??""}/${C.path}`;await window.__nanoNotepad.import(C.name,y.content,{sourcePath:F})}},{id:"rename",label:s.rename,icon:x.default.createElement(U.IconEditOutlineRegular,{width:14,height:14}),run:()=>{V(void 0),_({kind:"rename",entry:{...r,meta:{kind:C.kind}}})}},{id:"delete",label:s.delete,tone:"danger",icon:x.default.createElement(U.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{W(void 0),Ke(r)}}].filter(Boolean)},[C,s,B,i,Qe]);return x.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":f.scheme()},x.default.createElement("div",{className:"nxe-header"},x.default.createElement("span",{className:"nxe-path",title:i,"data-nxe-path":"true"},i),x.default.createElement(He,{label:s.newFile,onClick:()=>{wt("file")}},aa()),x.default.createElement(He,{label:s.newFolder,onClick:()=>{wt("folder")}},ra()),x.default.createElement(He,{label:s.rename,disabled:p.selected===null,onClick:()=>{let r=p.selected;r!==null&&(V(void 0),_({kind:"rename",entry:{path:r,name:Oe(r),meta:{kind:p.levels.has(r)?"directory":"file"}}}))}},ia()),x.default.createElement(sa,{copy:s,cwd:i??"",apps:B}),x.default.createElement(He,{label:s.reload,onClick:()=>{p.refresh(),X(),q()}},oa())),Me===void 0?null:x.default.createElement("p",{className:"nxe-row-note",role:"status"},Me),j===void 0?null:x.default.createElement("p",{className:"nxe-row-note nxe-note-error"},j),Le===null?null:x.default.createElement(ze,{copy:s,title:s.deleteTitle,busy:xe,confirmLabel:s.delete,onConfirm:()=>{bn(Le)},onCancel:()=>{Ke(null),W(void 0)},description:x.default.createElement(x.default.Fragment,null,s.deleteBody(Le.name),Le.kind==="directory"?x.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${s.deleteFolderNote}`):null)}),k===null?null:x.default.createElement(at,{copy:s,mode:"create",busy:xe,currentName:k.proposed,onConfirm:r=>{vn(r)},onCancel:()=>{I(null),W(void 0)}}),x.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:Bn},On),x.default.createElement(et,{text:We}),x.default.createElement(Yt,{copy:s,git:w,stats:P,statsState:g,prefs:b,onOpenBranch:()=>Ne("branch"),onOpenCommit:()=>Ne("commit"),onRetryStats:()=>{q()},onOpenSettings:()=>ct(!0)}),Rn,x.default.createElement(_t,{copy:s,open:cn,prefs:b,onClose:()=>ct(!1),setPref:(r,o)=>f.setPref(r,o)}),x.default.createElement(At,{copy:s,open:dt==="branch",git:w,busy:ut,error:mt,onClose:()=>{Ne(null),ie(void 0)},onPull:bt,onCheckout:En,onRefresh:async()=>{await X()}}),x.default.createElement(zt,{copy:s,open:dt==="commit",git:w,busy:ut,error:mt,onClose:()=>{Ne(null),ie(void 0)},onCommit:Sn,onPull:bt,onOpenConflict:r=>{ke({path:ue(i??"",r)}),Ne(null)}}),x.default.createElement(Vt,{menu:C,copy:s,actions:Dn,onClose:()=>oe(null)}))}function He({label:e,onClick:n,children:t,disabled:a}){return x.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:a===!0},t)}function Xn(e,n){let t=e.selected;if(t===null)return n;let a=J(n,t);return e.levels.has(a)?a:Ge(a)}function Qn(e,n,t){return e.levels.get(J(n,t))?.entries??[]}var Zn=U.IconPlusOutlineRegular,ea=U.IconFolderCloseRegular,ta=U.IconEditOutlineRegular,na=U.IconRefreshOutlineRegular;function aa(){return x.default.createElement(Zn,{width:16,height:16})}function ra(){return x.default.createElement(ea,{width:16,height:16})}function oa(){return x.default.createElement(na,{width:16,height:16})}function ia(){return x.default.createElement(ta,{width:16,height:16})}function sa({copy:e,cwd:n,apps:t}){let a=Array.isArray(t)?t:[];if(n===""||a.length===0)return null;let[d,u]=x.default.useState(a[0]),[c,f]=x.default.useState(!1),v=x.default.useRef(null),m=a.includes(d)?d:a[0];x.default.useEffect(()=>{if(!c)return;let s=w=>{v.current!==null&&!v.current.contains(w.target)&&f(!1)},b=w=>{w.key==="Escape"&&f(!1)};return document.addEventListener("pointerdown",s,!0),document.addEventListener("keydown",b,!0),()=>{document.removeEventListener("pointerdown",s,!0),document.removeEventListener("keydown",b,!0)}},[c]);let i=s=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:s,path:n}),credentials:"same-origin"})};return x.default.createElement("span",{className:"nxe-reveal",ref:v,"data-nxe-reveal":m},x.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(je[m]??m),"aria-label":e.revealIn(je[m]??m),onClick:()=>{i(m)}},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(m)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),x.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(c),onClick:()=>f(s=>!s)},x.default.createElement("svg",{viewBox:"0 0 10 10",width:10,height:10,fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round","aria-hidden":"true"},x.default.createElement("path",{d:"M2.5 4L5 6.5 7.5 4"}))),c?x.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},a.map(s=>x.default.createElement("button",{key:s,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{u(s),f(!1),i(s)}},x.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},x.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(s)}`,alt:"",width:14,height:14})),x.default.createElement("span",{className:"nano-menu-label"},je[s]??s)))):null)}var je={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var la={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkBadge:"\u8F6F\u94FE\u63A5",linkBroken:"\u94FE\u63A5\u76EE\u6807\u4E0D\u5B58\u5728",symlinkOutsideBadge:"\u8F6F\u94FE\u63A5\uFF08\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF09",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowSystemFiles:"\u663E\u793A\u7CFB\u7EDF\u6587\u4EF6",settingsShowSystemFilesHint:"\u6253\u5F00\u540E\u663E\u793A .git \u548C .DS_Store\u3002\u9ED8\u8BA4\u4E0D\u663E\u793A\u3002",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",branchDrawerSummary:(e,n,t)=>`${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitDrawerBody:(e,n)=>n?`${n} \xB7 ${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`:`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,commitPlaceholderOn:e=>`\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\uFF08Ctrl+Enter \u63D0\u4EA4\u5230 ${e}\uFF09`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",branchesHeading:"\u5207\u6362\u5206\u652F",branchesEmpty:"\u6CA1\u6709\u5176\u4ED6\u5206\u652F\u3002",branchHeldElsewhere:"\u8FD9\u4E2A\u5206\u652F\u5DF2\u5728\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6811\u4E2D\u68C0\u51FA\uFF0C\u65E0\u6CD5\u5728\u8FD9\u91CC\u5207\u6362",branchHeldShort:"\u5176\u4ED6\u5DE5\u4F5C\u6811",branchCurrentShort:"\u5F53\u524D",branchSwitched:e=>`\u5DF2\u5207\u6362\u5230 ${e}`,worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",countStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,countUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,countUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,countConflict:e=>`\u51B2\u7A81 ${e}`,groupStaged:e=>`\u5DF2\u6682\u5B58 ${e}`,groupUnstaged:e=>`\u672A\u6682\u5B58 ${e}`,groupUntracked:e=>`\u672A\u8DDF\u8E2A ${e}`,historyHeading:"\u6700\u8FD1\u63D0\u4EA4",historyEmpty:"\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002",ageJustNow:"\u521A\u521A",ageMinutes:e=>`${e} \u5206\u949F\u524D`,ageHours:e=>`${e} \u5C0F\u65F6\u524D`,ageDays:e=>`${e} \u5929\u524D`,branchFilter:"\u641C\u7D22\u5206\u652F\u6216\u8DEF\u5F84",branchFilterEmpty:"\u6CA1\u6709\u5339\u914D\u7684\u5206\u652F\u6216\u5DE5\u4F5C\u6811\u3002",branchesHeadingCount:e=>`\u5206\u652F ${e}`,worktreesHeadingCount:e=>`\u5DE5\u4F5C\u6811 ${e}`,refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Reload",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkBadge:"Symbolic link",linkBroken:"The link target does not exist",symlinkOutsideBadge:"Symlink to outside the workspace",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowSystemFiles:"Show system files",settingsShowSystemFilesHint:"Shows .git and .DS_Store. Hidden by default.",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",branchDrawerSummary:(e,n,t)=>`${e} \xB7 ${n} \xB7 ${t}`,commitDrawerTitle:"Pending changes",commitDrawerBody:(e,n)=>n?`${n} \xB7 ${e} files changed`:`${e} files changed`,commitPlaceholderOn:e=>`Describe this change (Ctrl+Enter commits on ${e})`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",branchesHeading:"Switch branch",branchesEmpty:"No other branches.",branchHeldElsewhere:"This branch is checked out in another worktree, so it cannot be taken here",branchHeldShort:"other worktree",branchCurrentShort:"current",branchSwitched:e=>`Switched to ${e}`,worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",countStaged:e=>`Staged ${e}`,countUnstaged:e=>`Unstaged ${e}`,countUntracked:e=>`Untracked ${e}`,countConflict:e=>`Conflicts ${e}`,groupStaged:e=>`Staged ${e}`,groupUnstaged:e=>`Unstaged ${e}`,groupUntracked:e=>`Untracked ${e}`,historyHeading:"Recent commits",historyEmpty:"This repository has no commits yet.",ageJustNow:"just now",ageMinutes:e=>`${e}m ago`,ageHours:e=>`${e}h ago`,ageDays:e=>`${e}d ago`,branchFilter:"Filter branches or paths",branchFilterEmpty:"No matching branch or worktree.",branchesHeadingCount:e=>`Branches ${e}`,worktreesHeadingCount:e=>`Worktrees ${e}`,refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function da(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function Se(e){return la[da(e)]}function on(e,n,t,a){let d={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&a!==void 0?e.statusBoth(d):t!==void 0?e.statusStaged(d):a!==void 0?e.statusUnstaged(d):d}var sn=`${tt}

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
`;var dn=K(M("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:he,useCallback:fr,useEffect:gr,useState:xr}=lt.default,ca=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"];var ua="files",st="nano-explorer-extra",ln={handler:void 0};function ma(){let e=jt(),n=new Set;return{get:()=>e,set:t=>{e=t,Wt(e);for(let a of n)a()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function ha(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=sn,document.head.append(n),e.effect(()=>()=>n.remove());let t=ma(),a=m=>e.sessions.list.getSnapshot().byId[m]?.cwd,d=m=>{ln.handler?.(m)},u=()=>e.locale.getSnapshot().active,c=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",f=()=>({copy:Se(u()),prefs:t.get(),getPrefs:()=>t.get(),subscribePrefs:m=>t.subscribe(m),scheme:c,statusLabel:on,onListed:()=>{},setRenameHandler:m=>{ln.handler=m},setPref:(m,i)=>t.set({...t.get(),[m]:i})});e.effect(()=>e.sidebarRightTabs.register({id:st,kind:ua,priority:"extension",keepMounted:!0,title:()=>Se(u()).typeLabel,guide:[{id:"explorer",order:10,title:()=>Se(u()).typeLabel,description:()=>Se(u()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:st,inject:()=>({nxe:f()})},rn)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:st},function({useTabInfo:i}){let{tab:s}=i();return he(lt.default.Fragment,null,he(dn.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),s.title)})),"nano-explorer-extra: files tab title");let v=e.get("contextMenus");if(v!=null)for(let m of["file","directory"])e.effect(()=>v.register({id:`nano-explorer-extra.${m}`,target:m,order:900,resolve:async i=>{let s=Se(u()),b=i.sessionId===void 0?void 0:a(i.sessionId),w=b===void 0?i.path:ee(b,i.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:s.copyRelative,failureLabel:s.copyFailed,run:()=>pa(w)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:s.rename,failureLabel:s.renameFailed,run:()=>d?.({path:i.path,kind:m==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${m} menu`);e.slots.inject("contextMenu.icon",()=>{let m=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},fa),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},ga)];return()=>{for(let i of m)i()}})}async function pa(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function fa(){return he("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},he("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),he("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))}function ga(){return he("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},he("path",{d:"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"}),he("path",{d:"M13.5 6.5 17.5 10.5"}))}return zn(xa);})();
		return __nxeExport;
	}
});
