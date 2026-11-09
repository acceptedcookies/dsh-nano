window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var Cn=Object.create;var Ue=Object.defineProperty;var Tn=Object.getOwnPropertyDescriptor;var On=Object.getOwnPropertyNames;var $n=Object.getPrototypeOf,Rn=Object.prototype.hasOwnProperty;var A=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var Bn=(e,n)=>{for(var t in n)Ue(e,t,{get:n[t],enumerable:!0})},Ct=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let l of On(n))!Rn.call(e,l)&&l!==t&&Ue(e,l,{get:()=>n[l],enumerable:!(r=Tn(n,l))||r.enumerable});return e};var G=(e,n,t)=>(t=e!=null?Cn($n(e)):{},Ct(n||!e||!e.__esModule?Ue(t,"default",{value:e,enumerable:!0}):t,e)),Dn=e=>Ct(Ue({},"__esModule",{value:!0}),e);var ca={};Bn(ca,{DEFAULT_PREFS:()=>Ne,apply:()=>ia,inject:()=>aa});var ut=G(A("react"),1);var p=G(A("react"),1);var q=G(A("react"),1),lt=A("@deepseek-ai/dsh-client-ui-primitives");var ue=G(A("react"),1),$e=A("@deepseek-ai/dsh-client-ui-primitives");function ke({copy:e,title:n,description:t,confirmLabel:r,confirmDisabled:l,busy:h,error:g,danger:f,footer:x,maxHeight:d,width:s,region:i,onConfirm:m,onCancel:b,children:$}){return ue.default.createElement($e.Modal,{open:!0,onClose:b,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",d===void 0?"":"nano-dialog-capped",s===void 0?"":"nano-dialog-sized",i===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:x??ue.default.createElement(ue.default.Fragment,null,ue.default.createElement($e.Button,{variant:"outline",className:"nano-modal-action",onClick:b},e.cancel),ue.default.createElement($e.Button,{variant:f?"danger":"primary",className:"nano-modal-action",disabled:l===!0||h===!0,onClick:m},r??e.confirm))},$,g===void 0?null:ue.default.createElement("p",{className:"nano-dialog-error",role:"alert"},g))}var pe=G(A("react"),1),{useCallback:ma,useEffect:Tt,useRef:Ot,useState:In}=pe.default;function ot({menu:e,actions:n,onClose:t,width:r=208}){let l=Ot(null),[h,g]=In(0),f=e===null?[]:n,x=f.length,d=Ot(f);d.current=f;let s=e===null?null:e.openedAt;if(Tt(()=>{s!==null&&g(0)},[s]),Tt(()=>{if(e===null)return;let $=k=>{l.current!==null&&!l.current.contains(k.target)&&t()},W=k=>{if(k.key==="Escape"){k.stopPropagation(),t();return}if(k.key==="ArrowDown"){k.preventDefault(),g(ie=>(ie+1)%x);return}if(k.key==="ArrowUp"){k.preventDefault(),g(ie=>(ie-1+x)%x);return}k.key==="Enter"&&(k.preventDefault(),t(),d.current[h]?.run())};return document.addEventListener("pointerdown",$,!0),document.addEventListener("keydown",W,!0),()=>{document.removeEventListener("pointerdown",$,!0),document.removeEventListener("keydown",W,!0)}},[e,h,x,t]),e===null||x===0)return null;let i=x*28+8,m=Math.min(e.x,(window.innerWidth||r)-r-8),b=Math.min(e.y,(window.innerHeight||i)-i-8);return pe.default.createElement("div",{className:"nano-menu",role:"menu",ref:l,style:{position:"fixed",left:`${Math.max(8,m)}px`,top:`${Math.max(8,b)}px`,minWidth:`${r}px`},"data-nano-menu":"true"},f.map(($,W)=>pe.default.createElement($t,{key:$.id,item:$,index:W,active:W===h,onHover:g,onRun:t})))}function $t({item:e,index:n,active:t,onHover:r,onRun:l}){return pe.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>r(n),onClick:()=>{l(),e.run()}},e.icon===void 0?null:pe.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),pe.default.createElement("span",{className:"nano-menu-label"},e.label))}var Rt=G(A("react"),1);function it({text:e}){return e==null?null:Rt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var st=`
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
`;var{useState:Bt}=q.default;function Re(e){return q.default.createElement(ke,e)}function Dt({children:e}){return q.default.createElement("div",{className:"nxe-dialog-field"},e)}function It({copy:e,files:n,busy:t,error:r,onConfirm:l,onCancel:h}){let[g,f]=Bt(""),x=g.trim()==="";return q.default.createElement(Re,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:x,busy:t,error:r,onConfirm:()=>l(g),onCancel:h,description:e.commitBody(n.length)},q.default.createElement(Dt,null,q.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(d=>q.default.createElement("li",{key:d.path,title:d.path},`${d.status} ${d.path}`))),q.default.createElement(lt.Input,{value:g,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:d=>f(d.currentTarget.value)})))}function dt({copy:e,currentName:n,busy:t,error:r,onConfirm:l,onCancel:h,mode:g="rename"}){let[f,x]=Bt(n),d=f.trim()==="",s=g==="create";return q.default.createElement(Re,{copy:e,title:s?e.newEntryTitle:e.renameTitle,confirmLabel:s?e.create:e.confirm,busy:t,error:r,confirmDisabled:d,onConfirm:()=>l(f),onCancel:h,description:s?e.newEntryBody(n):e.renameBody(n)},q.default.createElement(Dt,null,q.default.createElement(lt.Input,{value:f,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:i=>x(i.currentTarget.value),onKeyDown:i=>{i.key==="Enter"&&!d&&(i.preventDefault(),l(f))}})))}var w=G(A("react"),1),me=A("@deepseek-ai/dsh-client-ui-primitives");var{useState:Ln}=w.default;function He({label:e,value:n,tone:t}){return w.default.createElement("div",{className:"nxe-fact","data-tone":t??"default"},w.default.createElement("span",{className:"nxe-fact-label"},e),w.default.createElement("span",{className:"nxe-fact-value"},n))}function Lt({copy:e,open:n,git:t,onClose:r,onPull:l,onRefresh:h,busy:g,error:f}){if(!n)return null;let x=t?.worktrees??[],d=t?.upstream??null,s=t?.behind??0;return w.default.createElement(ke,{copy:e,title:e.branchDrawerTitle,description:e.branchDrawerBody,error:f,maxHeight:420,footer:w.default.createElement(w.default.Fragment,null,w.default.createElement(me.Button,{variant:"outline",className:"nano-modal-action",onClick:()=>{h()}},e.refreshGit),d===null?null:w.default.createElement(me.Button,{variant:"primary",className:"nano-modal-action",disabled:g===!0||s===0,title:s===0?e.pullNothing:e.pullNow,onClick:()=>{l()}},e.pullNow)),onCancel:r},w.default.createElement("div",{className:"nxe-fact-group"},w.default.createElement(He,{label:e.factBranch,value:t?.detached?e.detached:t?.branch??e.detached}),w.default.createElement(He,{label:e.factUpstream,value:d??e.noUpstream,tone:d===null?"muted":"default"}),d===null?null:w.default.createElement(He,{label:e.factSync,value:e.factSyncValue(s,t?.ahead??0),tone:s>0?"emphasis":"default"}),w.default.createElement(He,{label:e.factState,value:(t?.conflicts?.length??0)>0?e.factConflicted(t.conflicts.length):(t?.files?.length??0)>0?e.factDirty(t.files.length):e.factClean,tone:(t?.conflicts?.length??0)>0?"danger":"default"})),w.default.createElement("h3",{className:"nxe-drawer-heading"},e.worktreesHeading),x.length===0?w.default.createElement("p",{className:"nxe-drawer-empty"},e.worktreesEmpty):w.default.createElement("ul",{className:"nxe-drawer-list"},x.map(i=>w.default.createElement("li",{key:i.path,className:"nxe-drawer-row","data-current":String(i.path===t?.root)},w.default.createElement("span",{className:"nxe-drawer-row-main"},i.detached?e.detached:i.branch??e.detached),w.default.createElement("span",{className:"nxe-drawer-row-path",title:i.path},i.path)))))}function At({copy:e,open:n,git:t,onClose:r,onCommit:l,onPull:h,busy:g,error:f,onOpenConflict:x}){let[d,s]=Ln("");if(!n)return null;let i=t?.files??[],m=t?.conflicts??[],b=i.length,$=t?.upstream??null,W=b>0&&m.length===0&&d.trim()!=="";return w.default.createElement(ke,{copy:e,title:e.commitDrawerTitle,description:e.commitDrawerBody(b),error:f,maxHeight:460,footer:w.default.createElement(w.default.Fragment,null,$===null?null:w.default.createElement(me.Button,{variant:"outline",className:"nano-modal-action",disabled:g===!0||(t?.behind??0)===0,title:(t?.behind??0)===0?e.pullNothing:e.pullNow,onClick:()=>{h()}},e.pullNow),w.default.createElement(me.Button,{variant:"primary",className:"nano-modal-action",disabled:!W||g===!0,onClick:()=>{l(d)}},e.commit)),onCancel:r},w.default.createElement("div",{className:"nxe-dialog-field"},w.default.createElement("p",null,e.commitMessageLabel),w.default.createElement(me.Input,{value:d,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:k=>s(k.currentTarget.value)})),m.length===0?null:w.default.createElement("div",{className:"nxe-conflict-block"},w.default.createElement("h3",{className:"nxe-drawer-heading"},e.conflictsHeading(m.length)),w.default.createElement("p",{className:"nxe-drawer-empty"},e.conflictsBody),w.default.createElement("ul",{className:"nxe-drawer-list"},m.map(k=>w.default.createElement("li",{key:k,className:"nxe-drawer-row","data-tone":"danger"},w.default.createElement("button",{type:"button",className:"nxe-drawer-link",title:k,onClick:()=>x(k)},k))))),w.default.createElement("h3",{className:"nxe-drawer-heading"},e.pendingHeading(b)),b===0?w.default.createElement("p",{className:"nxe-drawer-empty"},e.pendingEmpty):w.default.createElement("ul",{className:"nxe-drawer-list nxe-drawer-scroll"},i.slice(0,200).map(k=>w.default.createElement("li",{key:k.path,className:"nxe-drawer-row","data-status":k.status},w.default.createElement("span",{className:"nxe-drawer-row-status","data-status":k.status},k.status),w.default.createElement("span",{className:"nxe-drawer-row-main",title:k.path},k.path)))))}var P=G(A("react"),1);function Ft(e){return function({entry:t}){let r=e.copy(),l=e.statusOf(t.path),h=e.ignoredOf(t.path),g=e.linkOf(t.path),f=t.meta?.kind!=="directory",x=f?void 0:e.folderStatusOf(t.path),d=e.showGit()&&!h,s=d?e.stagedOf(t.path):void 0,i=d?e.unstagedOf(t.path):void 0,m=d?e.remoteOf(t.path):void 0;return P.default.createElement("span",{className:"nxe-acc",...h?{"data-nxe-ignored":"true"}:{}},g===void 0?null:P.default.createElement("span",{className:"nxe-acc-link",title:g?r.symlinkOutside:r.symlinkBadge,"aria-label":g?r.symlinkOutside:r.symlinkBadge,"data-nxe-symlink":g?"outside":"inside"},P.default.createElement("svg",{viewBox:"0 0 24 24",width:11,height:11,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round","aria-hidden":"true"},P.default.createElement("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),P.default.createElement("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))),m===void 0?null:P.default.createElement("span",{className:"nxe-acc-remote","data-status":m.status,"data-direction":m.direction,title:m.direction==="pulled"?r.remotePulled(m.status):r.remotePushed(m.status),"aria-label":m.direction==="pulled"?r.remotePulled(m.status):r.remotePushed(m.status)},`${m.direction==="pulled"?"\u2193":"\u2191"}${m.status}`),d&&l!==void 0?P.default.createElement("span",{className:"nxe-acc-letter","data-status":l,"data-staged":s===void 0?"false":"true",title:e.statusLabel(l,s,i),"aria-label":e.statusLabel(l,s,i)},l):null,d&&x!==void 0?P.default.createElement("span",{className:"nxe-acc-dot","data-status":x,title:e.statusLabel(x),"aria-label":e.statusLabel(x)}):null,h?P.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"!",title:r.ignoredBadge,"aria-label":r.ignoredBadge},"!"):null,f&&e.showOpenButton()?P.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:r.openFile,"aria-label":`${r.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:b=>{b.stopPropagation(),e.open(t)}},P.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},P.default.createElement("path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}),P.default.createElement("path",{d:"M15 3h6v6"}),P.default.createElement("path",{d:"M10 14 21 3"}))):null)}}var S=G(A("react"),1);function Be(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,r=0;for(;t>=1024&&r<n.length-1;)t/=1024,r+=1;return`${r===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[r]}`}function Mt(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}var H=A("@deepseek-ai/dsh-client-ui-primitives");function ct({icon:e,value:n,title:t,scope:r}){return S.default.createElement("span",{className:"nxe-figure",title:t,"aria-label":t,"data-nxe-figure":r},e,S.default.createElement("span",{className:"nxe-figure-value"},n))}function Pt(e){let{copy:n,git:t,stats:r,statsState:l,prefs:h,onOpenBranch:g,onOpenCommit:f}=e;if(!h.showStatusBar)return null;let x=[];if(t==null)x.push(S.default.createElement("span",{key:"norepo",className:"nxe-chip","data-nxe-git":"none",title:n.noRepo},S.default.createElement(H.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),S.default.createElement("span",{className:"nxe-chip-label"},n.notRepo)));else{let s=t.detached?n.detached:t.branch??n.detached,i=t.files?.length??0,m=t.conflicts?.length??0,b=i>0;x.push(S.default.createElement("button",{key:"branch",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-branch-button":"true","data-dirty":String(b),"data-conflicted":String(m>0),"data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:n.branchButtonTooltip(s,b,m),"aria-label":n.branchButtonTooltip(s,b,m),onClick:g},S.default.createElement(H.IconBranchOutlineRegular,{width:14,height:14}),S.default.createElement("span",{className:"nxe-chip-label","data-nxe-branch":t.branch??""},s),b?S.default.createElement("span",{className:"nxe-chip-flag","data-kind":"dirty","aria-hidden":"true"},"*"):null,m>0?S.default.createElement("span",{className:"nxe-chip-flag","data-kind":"conflict","aria-hidden":"true"},"!"):null)),typeof t.stashed=="number"&&t.stashed>0&&x.push(S.default.createElement("span",{key:"stash",className:"nxe-chip nxe-chip-static","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},S.default.createElement(H.IconArchiveOutlineRegular,{width:14,height:14}),S.default.createElement("span",{className:"nxe-chip-label"},String(t.stashed))));let $=t.upstream===null||t.upstream===void 0?void 0:Mt(t.ahead??0,t.behind??0);x.push(S.default.createElement("button",{key:"commit",type:"button",className:"nxe-chip nxe-chip-button","data-nxe-commit-button":"true","data-pending":String(i),title:n.commitButtonTooltip(i,$===void 0?null:$),"aria-label":n.commitButtonTooltip(i,$===void 0?null:$),onClick:f},S.default.createElement(H.IconRefreshOutlineRegular,{width:14,height:14}),S.default.createElement("span",{className:"nxe-chip-count","data-nxe-pending":String(i)},String(i)),$===void 0?null:S.default.createElement("span",{className:"nxe-chip-sync","data-nxe-sync":"true"},$)))}let d=[];if(l==="loading")d.push(S.default.createElement("span",{key:"loading",className:"nxe-figure-value"},n.statsLoading));else if(l==="failed")d.push(S.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:e.onRetryStats},n.statsFailed));else if(r!=null){let s=r.truncated?"+":"",i=h.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:"";d.push(S.default.createElement(ct,{key:"dirs",scope:"directories",icon:S.default.createElement(H.IconFolderCloseRegular,{width:13,height:13}),value:`${r.directories}${s}`,title:n.statsTooltip(r.files,r.directories,Be(r.bytes))+i})),d.push(S.default.createElement(ct,{key:"files",scope:"files",icon:S.default.createElement(H.IconDeliverDocRegular,{width:13,height:13}),value:`${r.files}${s}`,title:n.statsTooltip(r.files,r.directories,Be(r.bytes))+i})),d.push(S.default.createElement(ct,{key:"bytes",scope:"bytes",icon:S.default.createElement(H.IconGaugeOutlineRegular,{width:13,height:13}),value:Be(r.bytes),title:n.statsSizeTooltip(Be(r.bytes))+i}))}return S.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},S.default.createElement("div",{className:"nxe-status-left"},x),S.default.createElement("div",{className:"nxe-status-right"},d))}var zt=G(A("react"),1);function Gt({menu:e,actions:n,onClose:t}){return zt.default.createElement(ot,{menu:e,actions:n,onClose:t})}var F=G(A("@deepseek-ai/dsh-client-ui-primitives"),1);var Wt=G(A("react"),1);function le(e,n){let t=ne(e),r=String(n??"").replace(/\\/gu,"/");return r===""?t:r.startsWith("/")||/^[A-Za-z]:\//u.test(r)?ne(r):`${t==="/"?"":t}/${r}`.replace(/\/{2,}/gu,"/")}function U(e,n){return ne(le(e,n))}function An(e,n){let t=ne(e),r=ne(n);return t===r?!0:r.startsWith(t==="/"?"/":`${t}/`)}function Q(e,n){let t=ne(e),r=ne(n);return r===t?"":An(t,r)?r.slice(t==="/"?1:t.length+1):r}function We(e){let n=ne(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function De(e){let n=ne(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function ne(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:he,useEffect:Ut,useMemo:Ht,useRef:Ie,useState:Le}=Wt.default;function jt(e){let{sessionId:n,root:t,request:r,prefs:l,onListed:h}=e,[g,f]=Le(()=>new Map),[x,d]=Le(()=>new Set),s=Ie(x);s.current=x;let[i,m]=Le(null),[b,$]=Le(null),[W,k]=Le(0),ie=Ie(!0),Fe=Ie(h);Fe.current=h,Ut(()=>()=>{ie.current=!1},[]);let Y=he(async(E,v=!1,N=void 0)=>{let T=U(t,E);v||f(ee=>{let z=new Map(ee);return z.get(T)===void 0&&z.set(T,{loading:!0,entries:[]}),z});let C=await r("/list",{sessionId:n,path:E,followSymlinks:l.followSymlinks,allowOutsideWorkspace:N===!0||l.allowOutsideWorkspace===!0||l.allowed?.includes(U(t,E))===!0});if(ie.current)return f(ee=>{let z=new Map(ee),te=z.get(T);return C.ok?z.set(T,{entries:C.entries,truncated:C.truncated===!0,outside:C.outside===!0,failed:te?.failed===!0&&te.entries?.length>0?te.failed:!1}):z.set(T,{entries:te?.entries??[],failed:!0,message:C.message,code:C.code}),z}),Fe.current?.(E,C.ok?C.entries.map(ee=>ee.name):[]),C},[t,n,r,l.followSymlinks,l.allowOutsideWorkspace,l.allowed]),fe=Ie(void 0),ce=Ie([]);Ut(()=>{if(t!==void 0){if(fe.current!==t){fe.current=t,f(new Map),d(new Set),Y(t);return}Y(t,!0);for(let E of ce.current)Y(E,!0)}},[t,W,Y]);let J=he(async()=>{ce.current=[...s.current],k(E=>E+1)},[]),ge=he(E=>Y(E,!0),[Y]),X=he((E,v)=>{let N=U(t,E);d(T=>{let C=new Set(T);return v?C.add(N):C.delete(N),C}),v&&g.get(N)===void 0&&Y(E)},[t,g,Y]),Me=he(E=>{let v=U(t,E);f(N=>{if(N.has(v))return N;let T=new Map(N);return T.set(v,{entries:[]}),T})},[t]),j=he(E=>{let v=U(t,E);f(N=>{if(!N.has(v))return N;let T=new Map(N);return T.delete(v),T})},[t]),Ce=he(E=>{let v=U(t,E);d(N=>{let T=new Set;for(let C of N)C!==v&&!C.startsWith(`${v}/`)&&T.add(C);return T}),f(N=>{let T=new Map;for(let[C,ee]of N)C!==v&&!C.startsWith(`${v}/`)&&T.set(C,ee);return T})},[t]),Te=Ht(()=>{let E=[];for(let[v,N]of g)for(let T of N.entries??[]){let C=v===""?T.name:`${v}/${T.name}`;E.push({...T,path:C})}return E},[g]),qe=Ht(()=>{let E={};for(let[v,N]of g)N.loading===!0&&(N.entries?.length??0)===0?E[v]={loading:!0}:N.failed===!0?E[v]={failure:N.message}:N.truncated===!0&&(E[v]={truncated:!0});return E},[g]);return{levels:g,entries:Te,directories:qe,expanded:[...x],selected:i,setSelected:m,toggle:X,pending:b,setPending:$,refresh:J,refreshLevel:ge,loadLevel:Y,forget:j,collapseUnder:Ce,knownEmpty:Me}}var Fn=".md";function _t(e,n){let t=e==="file"?"untitled":"new-folder",r=new Set((n??[]).map(h=>String(h.name??"").toLowerCase())),l=h=>e==="file"?`${t}${h===1?"":`-${h}`}${Fn}`:`${t}${h===1?"":`-${h}`}`;for(let h=1;h<1e4;h+=1){let g=l(h);if(!r.has(g.toLowerCase()))return g}throw new Error("cannot find an unused name")}function Kt(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:O,useEffect:Ae,useMemo:ae,useRef:Ee,useState:B}=p.default,Mn=400,Pn=["U","D","M","A","R","?"],zn=new Set([".git",".DS_Store"]);function qt(e){let{useTabInfo:n,sessionId:t,useSessions:r,renderSlot:l,renderFactorySlot:h,useContextMenu:g,nxe:f}=e,{tab:x,panel:d}=n(),s=r(a=>a.byId[t]?.cwd),i=f.copy,m=f.prefs,[b,$]=B(null),[W,k]=B(void 0),[ie,Fe]=B(null),[Y,fe]=B("idle"),[ce,J]=B(null),[ge,X]=B(!1),[Me,j]=B(void 0),Ce=Ee(new Set),[Te,qe]=B(()=>new Set),[E,v]=B(void 0),[N,T]=B(void 0),[C,ee]=B([]);Ae(()=>{let a=!0;return(async()=>{try{let o=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!o.ok)return;let c=await o.json(),y=Array.isArray(c.apps)?c.apps:[];a&&ee(y.filter(D=>typeof D=="string"))}catch{}})(),()=>{a=!1}},[]);let[z,te]=B(null),[L,pt]=B(null),[Pe,Ye]=B(null),[mt,Oe]=B(null),[ht,ze]=B(!1),[ft,xe]=B(void 0),Ve=Ee(0),[Je,Xe]=B(null),[Ze,an]=B(()=>new Map),gt=Ee({path:"",at:0}),we=Ee(m);we.current=m;let R=O(async(a,o)=>{try{let c=await fetch(`/nano-explorer-extra${a}`,{method:o===void 0?"GET":"POST",headers:o===void 0?void 0:{"content-type":"application/json"},body:o===void 0?void 0:JSON.stringify(o),credentials:"same-origin",cache:"no-store"}),y=await c.json().catch(()=>({error:`HTTP ${c.status}`}));return c.ok?{ok:!0,...y}:{ok:!1,message:y?.error??`HTTP ${c.status}`}}catch(c){return{ok:!1,message:c instanceof Error?c.message:String(c)}}},[]),rn=O(async(a,o)=>{if(!we.current.showGitStatus||!Array.isArray(o)||o.length===0)return;let c=await R("/ignored",{sessionId:t,paths:o});!c.ok||!Array.isArray(c.ignored)||c.ignored.length===0||sn(y=>{let D=new Set(y),M=Q(s??"",a);for(let K of c.ignored)D.add(M===""?K:`${M}/${K}`);return D})},[R,t,s]),xt=ae(()=>[...Te],[Te]),on=ae(()=>({...m,allowed:xt}),[m,xt]),u=jt({sessionId:t,root:s,request:R,prefs:on,onListed:(a,o)=>{rn(a,o)}}),Z=O(async()=>{if(s===void 0)return;if(!we.current.showGitStatus){$(null),k(void 0);return}let a=await R(`/status?sessionId=${encodeURIComponent(t)}`);if(!a.ok){k(a.message);return}$(a.git??null),k(a.gitError)},[s,t,R]),V=O(async()=>{if(s===void 0)return;fe("loading");let a=await R(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!a.ok){fe("failed");return}Fe(a.stats??null),fe("ok")},[s,t,R]);Ae(()=>{Z()},[Z]),Ae(()=>{V()},[s]);let Qe=Ee(0),be=O(()=>{window.clearTimeout(Qe.current),Qe.current=window.setTimeout(()=>{V()},2e3)},[V]);Ae(()=>()=>{window.clearTimeout(Qe.current),window.clearTimeout(Ve.current)},[]);let et=ae(()=>Array.isArray(b?.files)?b.files:[],[b]),tt=ae(()=>{let a=new Map;for(let o of et)a.set(o.path,o);return a},[et]),[nt,sn]=B(()=>new Set),ve=b?.root,wt=Ee(ve);wt.current=ve;let se=ae(()=>{if(Ze.size===0)return tt;let a=new Map(tt);for(let[o,c]of Ze)a.set(o,c);return a},[tt,Ze]),_=O(a=>{if(ve==null)return;let o=le(s??"",a);return Q(ve,o)},[ve,s]),at=O(a=>{let o=_(a);if(o===void 0)return!1;if(nt.has(o))return!0;let c=o.split("/");for(let y=c.length-1;y>0;y-=1)if(nt.has(c.slice(0,y).join("/")))return!0;return!1},[nt,_]),bt=O(a=>{let o=_(a);if(o!==void 0)return se.get(o)?.status},[se,_]),ln=O(a=>{let o=_(a);if(o!==void 0)return se.get(o)?.staged},[se,_]),dn=O(a=>{let o=_(a);if(o!==void 0)return se.get(o)?.unstaged},[se,_]),vt=ae(()=>{let a=new Map;for(let o of b?.remote?.pushed??[])a.set(o.path,{status:o.status,direction:"pushed"});for(let o of b?.remote?.pulled??[])a.set(o.path,{status:o.status,direction:"pulled"});return a},[b]),cn=O(a=>{let o=_(a);if(o!==void 0)return vt.get(o)},[vt,_]),ye=O(a=>{let o=le(s??"",a.path),c=`dsh-resource://file/session/${encodeURIComponent(t)}/${o.replace(/^\/+/,"").split("/").map(encodeURIComponent).join("/")}`;d.isFloating?x.actions.openResource(c):x.actions.openResource(c,{paneId:d.id})},[s,t,x.actions,d.id,d.isFloating]),yt=O(async a=>{if(s===void 0||!we.current.showGitStatus)return;let o=await R(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(a)}`);if(!o.ok||o.git===null||o.git===void 0)return;let c=o.git.root;an(y=>{let D=new Map(y);for(let M of o.git.files??[]){let K=c===void 0?M.path:`${c.replace(/\/+$/u,"")}/${M.path}`,Ge=wt.current??s,Nt=Q(Ge,K);Nt!==K&&D.set(Nt,M)}return D})},[s,t,R]),un=O(async a=>{let o=await u.loadLevel(a.path);if(o?.ok){u.toggle(a.path,!0),yt(a.path);return}if(o?.code!=="outside-workspace"){u.toggle(a.path,!0);return}Xe({path:a.path,name:a.name})},[u,yt]),pn=O(async a=>{X(!0);let o=await R("/delete",{sessionId:t,path:a.path,kind:a.kind==="directory"?"directory":"file"});if(X(!1),!o.ok){v(o.message);return}Ye(null),v(void 0),u.forget(a.path),u.collapseUnder(a.path);let c=We(a.path);c!==a.path&&await u.refreshLevel(c),u.selected===a.path&&u.setSelected(null),be()},[t,R,u,be]),kt=O(a=>{if(s===void 0)return;let o=Gn(u,s),c=Un(u,s,o);v(void 0),te({kind:a,directory:o,proposed:_t(a,c)})},[s,u]),mn=O(async a=>{if(z===null)return;let{kind:o,directory:c}=z,y=Kt(a,i);if(!y.ok){v(y.message);return}X(!0);let D=await R(o==="file"?"/create-file":"/create-folder",{sessionId:t,directory:c,name:y.name});if(X(!1),!D.ok){v(D.message);return}te(null),v(void 0),await u.refreshLevel(c);let M=Q(s??"",c),K=le(s??"",`${M===""?"":`${M}/`}${y.name}`);u.setSelected(K),o==="folder"&&(u.knownEmpty(K),u.toggle(K,!0)),be()},[z,i,s,t,R,u,be]),hn=O(async(a,o)=>{if(s===void 0)return;let c=le(s,a.path),y=a.meta?.kind==="directory"?"directory":"file";X(!0),j(void 0);let D=await R("/rename",{sessionId:t,path:c,name:o,kind:y});if(X(!1),!D.ok){j(D.message);return}J(null);let M=We(c);await u.refreshLevel(M),y==="directory"&&u.collapseUnder(c),u.setSelected(le(s,`${Q(s,M)===""?"":`${Q(s,M)}/`}${o.trim()}`)),be()},[s,t,R,u,be]),fn=O(async a=>{X(!0),j(void 0);let o=await R("/commit",{sessionId:t,message:a});if(X(!1),!o.ok){j(o.message);return}J(null),await u.refresh(),await Z(),await V()},[t,R,u,Z,V]),Et=O(async()=>{ze(!0),xe(void 0);let a=await R("/pull",{sessionId:t});if(ze(!1),!a.ok){xe(a.message);return}await u.refresh(),await Z(),await V()},[t,R,u,Z,V]),gn=O(async a=>{ze(!0),xe(void 0);let o=await R("/commit",{sessionId:t,message:a});if(ze(!1),!o.ok){xe(o.message);return}await u.refresh(),await Z(),await V()},[t,R,u,Z,V]),rt=O(async(a,o)=>{try{await navigator.clipboard.writeText(o||a),T(i.copied),window.clearTimeout(Ve.current),Ve.current=window.setTimeout(()=>T(void 0),1600)}catch(c){v(c instanceof Error?c.message:String(c))}},[i.copied]),xn=O((a,o)=>({onContextMenu:c=>{c.preventDefault(),c.stopPropagation(),u.setSelected(a.path),pt({x:c.clientX,y:c.clientY,path:a.path,name:a.name,kind:o,openedAt:Date.now()})}}),[u]),wn=O(a=>{let o=_(a);if(o===void 0)return;let c=o===""?"":`${o}/`,y,D=-1;for(let[M,K]of se){if(c!==""&&!M.startsWith(c))continue;let Ge=Pn.indexOf(K.status);Ge>D&&(D=Ge,y=K.status)}return y},[se,_]),St=ae(()=>Ft({copy:()=>i,statusOf:bt,stagedOf:ln,unstagedOf:dn,remoteOf:cn,ignoredOf:at,folderStatusOf:wn,linkOf:a=>u.levels.get(U(s??"",a))?.outside===!0?!0:void 0,showGit:()=>m.showGitStatus,showIgnoredBadge:()=>m.showIgnoredBadge,showOpenButton:()=>m.showOpenButton,statusLabel:a=>f.statusLabel(i,a),open:a=>ye(a)}),[i,bt,at,u.levels,s,m.showGitStatus,m.showIgnoredBadge,m.showOpenButton,f,ye]),bn=ae(()=>({slots:{accessory:St},fallback:null}),[St]);if(s===void 0)return p.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},i.noWorkspace);let vn=u.entries.filter(a=>!zn.has(a.name)).map(a=>({path:a.path,name:a.name,meta:{kind:a.type==="directory"?"directory":a.type==="file"?"file":"other",...a.symlink===!0?{link:!0}:{},...a.outside===!0?{outside:!0}:{},...at(a.path)?{hidden:!0}:{}}})),yn=h("sidebar.files.tree",{root:U(s,s),entries:vn,expanded:u.expanded,directories:u.directories,current:u.selected===null?void 0:U(s,u.selected),onToggle:a=>{if(u.expanded.includes(a.path)){u.toggle(a.path,!1);return}if(Te.has(a.path)){u.toggle(a.path,!0);return}un(a)},onOpen:a=>{u.setSelected(a.path);let o=Date.now(),c=gt.current,y=c.path===a.path&&o-c.at<=Mn;gt.current={path:a.path,at:o},(y?we.current.openPreviewOnDoubleClick:we.current.openPreviewOnClick)&&ye(a)},rowTriggerProps:xn,canOpen:()=>!0},bn);Ae(()=>{let a=o=>{j(void 0),J({kind:"rename",entry:{path:o.path,name:De(o.path),meta:{kind:o.kind}}})};return f.setRenameHandler(a),()=>f.setRenameHandler(void 0)},[f]);let kn=O(a=>{if(u.pending!==null)return;if(a.key==="F2"&&u.selected!==null){a.preventDefault(),j(void 0),J({kind:"rename",entry:{path:u.selected,name:De(u.selected),meta:{kind:u.levels.has(u.selected)?"directory":"file"}}});return}let o=u.selected;if(o===null)return;let c=U(s??"",o),y=u.levels.has(c)||u.expanded.includes(c);if(a.key===" "){if(!y)return;a.preventDefault(),u.toggle(o,!u.expanded.includes(c));return}if(a.key==="Enter"){if(a.preventDefault(),y){u.toggle(o,!u.expanded.includes(c));return}ye({path:c,name:De(o),meta:{kind:"file"}})}},[u,s,ye]),En=Je===null?null:p.default.createElement(Re,{copy:i,title:i.symlinkOutside,confirmLabel:i.openAnyway,onConfirm:()=>{let a=Je.path;Ce.current=new Set(Ce.current).add(a),qe(new Set(Ce.current)),Xe(null),u.loadLevel(a,!1,!0).then(()=>u.toggle(a,!0))},onCancel:()=>Xe(null),description:i.symlinkOutsideBody(Je.name)}),Sn=ce===null?null:ce.kind==="commit"?p.default.createElement(It,{copy:i,files:et,busy:ge,error:Me,onConfirm:fn,onCancel:()=>{J(null),j(void 0)}}):p.default.createElement(dt,{copy:i,currentName:ce.entry.name,busy:ge,error:Me,onConfirm:a=>hn(ce.entry,a),onCancel:()=>{J(null),j(void 0)}}),Nn=ae(()=>{if(L===null)return[];let a={path:L.path,name:L.name,kind:L.kind},o=C[0],c=y=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:y,path:L.path}),credentials:"same-origin"})};return[o===void 0?null:{id:"reveal",label:i.revealIn(_e[o]??o),icon:p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14}),run:()=>{c(o)}},{id:"copy-path",label:i.copyAbsolute,icon:p.default.createElement(F.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{rt(L.path,L.path)}},{id:"copy-relative",label:i.copyRelative,icon:p.default.createElement(F.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{rt(L.path,Q(s??"",L.path))}},L.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:i.openInNotepad,icon:p.default.createElement(F.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let y=await R("/read",{sessionId:t,path:L.path});if(!y.ok){v(y.message??i.openInNotepadFail);return}v(void 0);let D=L.path.startsWith("/")?L.path:`${s??""}/${L.path}`;await window.__nanoNotepad.import(L.name,y.content,{sourcePath:D})}},{id:"rename",label:i.rename,icon:p.default.createElement(F.IconEditOutlineRegular,{width:14,height:14}),run:()=>{j(void 0),J({kind:"rename",entry:{...a,meta:{kind:L.kind}}})}},{id:"delete",label:i.delete,tone:"danger",icon:p.default.createElement(F.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{v(void 0),Ye(a)}}].filter(Boolean)},[L,i,C,s,rt]);return p.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":f.scheme()},p.default.createElement("div",{className:"nxe-header"},p.default.createElement("span",{className:"nxe-path",title:s,"data-nxe-path":"true"},s),p.default.createElement(je,{label:i.newFile,onClick:()=>{kt("file")}},Kn()),p.default.createElement(je,{label:i.newFolder,onClick:()=>{kt("folder")}},qn()),p.default.createElement(je,{label:i.rename,disabled:u.selected===null,onClick:()=>{let a=u.selected;a!==null&&(j(void 0),J({kind:"rename",entry:{path:a,name:De(a),meta:{kind:u.levels.has(a)?"directory":"file"}}}))}},Vn()),p.default.createElement(Jn,{copy:i,cwd:s??"",apps:C}),p.default.createElement(je,{label:i.reload,onClick:()=>{u.refresh(),Z(),V()}},Yn())),E===void 0?null:p.default.createElement("p",{className:"nxe-row-note",role:"status"},E),W===void 0?null:p.default.createElement("p",{className:"nxe-row-note nxe-note-error"},W),Pe===null?null:p.default.createElement(Re,{copy:i,title:i.deleteTitle,busy:ge,confirmLabel:i.delete,onConfirm:()=>{pn(Pe)},onCancel:()=>{Ye(null),v(void 0)},description:p.default.createElement(p.default.Fragment,null,i.deleteBody(Pe.name),Pe.kind==="directory"?p.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${i.deleteFolderNote}`):null)}),z===null?null:p.default.createElement(dt,{copy:i,mode:"create",busy:ge,currentName:z.proposed,onConfirm:a=>{mn(a)},onCancel:()=>{te(null),v(void 0)}}),p.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:kn},yn),p.default.createElement(it,{text:N}),p.default.createElement(Pt,{copy:i,git:b,stats:ie,statsState:Y,prefs:m,onOpenBranch:()=>Oe("branch"),onOpenCommit:()=>Oe("commit"),onRetryStats:()=>{V()}}),Sn,En,p.default.createElement(Lt,{copy:i,open:mt==="branch",git:b,busy:ht,error:ft,onClose:()=>{Oe(null),xe(void 0)},onPull:Et,onRefresh:async()=>{await Z()}}),p.default.createElement(At,{copy:i,open:mt==="commit",git:b,busy:ht,error:ft,onClose:()=>{Oe(null),xe(void 0)},onCommit:gn,onPull:Et,onOpenConflict:a=>{ye({path:le(s??"",a)}),Oe(null)}}),p.default.createElement(Gt,{menu:L,copy:i,actions:Nn,onClose:()=>pt(null)}))}function je({label:e,onClick:n,children:t,disabled:r}){return p.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:r===!0},t)}function Gn(e,n){let t=e.selected;if(t===null)return n;let r=U(n,t);return e.levels.has(r)?r:We(r)}function Un(e,n,t){return e.levels.get(U(n,t))?.entries??[]}var Hn=F.IconPlusOutlineRegular,Wn=F.IconFolderCloseRegular,jn=F.IconEditOutlineRegular,_n=F.IconRefreshOutlineRegular;function Kn(){return p.default.createElement(Hn,{width:16,height:16})}function qn(){return p.default.createElement(Wn,{width:16,height:16})}function Yn(){return p.default.createElement(_n,{width:16,height:16})}function Vn(){return p.default.createElement(jn,{width:16,height:16})}function Jn({copy:e,cwd:n,apps:t}){let r=Array.isArray(t)?t:[];if(n===""||r.length===0)return null;let[l,h]=p.default.useState(r[0]),[g,f]=p.default.useState(!1),x=p.default.useRef(null),d=r.includes(l)?l:r[0];p.default.useEffect(()=>{if(!g)return;let i=b=>{x.current!==null&&!x.current.contains(b.target)&&f(!1)},m=b=>{b.key==="Escape"&&f(!1)};return document.addEventListener("pointerdown",i,!0),document.addEventListener("keydown",m,!0),()=>{document.removeEventListener("pointerdown",i,!0),document.removeEventListener("keydown",m,!0)}},[g]);let s=i=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:i,path:n}),credentials:"same-origin"})};return p.default.createElement("span",{className:"nxe-reveal",ref:x,"data-nxe-reveal":d},p.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(_e[d]??d),"aria-label":e.revealIn(_e[d]??d),onClick:()=>{s(d)}},p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(d)}`,alt:"",width:14,height:14})),p.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),p.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(g),onClick:()=>f(i=>!i)},p.default.createElement("svg",{viewBox:"0 0 10 10",width:10,height:10,fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round","aria-hidden":"true"},p.default.createElement("path",{d:"M2.5 4L5 6.5 7.5 4"}))),g?p.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},r.map(i=>p.default.createElement("button",{key:i,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{h(i),f(!1),s(i)}},p.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(i)}`,alt:"",width:14,height:14})),p.default.createElement("span",{className:"nano-menu-label"},_e[i]??i)))):null)}var _e={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var Se={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkOutside:"\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF0C\u9ED8\u8BA4\u4E0D\u8DDF\u968F",openAnyway:"\u4ECD\u7136\u6253\u5F00",symlinkOutsideBody:e=>`\u300C${e}\u300D\u6307\u5411\u5DE5\u4F5C\u533A\u4EE5\u5916\u3002\u5217\u76EE\u5F55\u4F1A\u8BFB\u53D6\u90A3\u4E2A\u4F4D\u7F6E\u7684\u5185\u5BB9\uFF0C\u4F46\u4EFB\u4F55\u5199\u5165\u4ECD\u7136\u88AB\u9650\u5236\u5728\u5DE5\u4F5C\u533A\u5185\u3002`,symlinkBadge:"\u8F6F\u94FE\u63A5",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsFollowSymlinks:"\u8DDF\u968F\u5DE5\u4F5C\u533A\u5185\u7684\u8F6F\u94FE\u63A5",settingsAllowOutside:"\u5141\u8BB8\u8D8A\u8FC7\u5DE5\u4F5C\u533A\u8FB9\u754C\u5217\u76EE\u5F55",settingsAllowOutsideHint:"\u5F00\u542F\u540E\u53EF\u4EE5\u6D4F\u89C8\u6307\u5411\u5DE5\u4F5C\u533A\u5916\u7684\u76EE\u5F55\u3002\u5199\u5165\u4ECD\u7136\u88AB\u9650\u5236\u5728\u5DE5\u4F5C\u533A\u5185\u3002",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,noRepo:"\u4E0D\u5728 Git \u4ED3\u5E93\u5185",branchButtonTooltip:(e,n,t)=>`\u5206\u652F ${e}${n?"\uFF0C\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539":"\uFF0C\u5DE5\u4F5C\u533A\u5E72\u51C0"}${t>0?`\uFF0C${t} \u4E2A\u51B2\u7A81`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4`:`${e} \u4E2A\u66F4\u6539\u5F85\u63D0\u4EA4\uFF0C${n}`,statsSizeTooltip:e=>`\u5DE5\u4F5C\u533A\u603B\u5927\u5C0F ${e}`,branchDrawerTitle:"\u5206\u652F\u4E0E\u5DE5\u4F5C\u6811",branchDrawerBody:"\u67E5\u770B\u5F53\u524D\u5206\u652F\u3001\u8FDC\u7A0B\u72B6\u6001\uFF0C\u4EE5\u53CA\u8FD9\u53F0\u673A\u5668\u4E0A\u7684\u6240\u6709\u5DE5\u4F5C\u6811\u3002",commitDrawerTitle:"\u5F85\u63D0\u4EA4\u7684\u66F4\u6539",commitDrawerBody:e=>`${e} \u4E2A\u6587\u4EF6\u7B49\u5F85\u63D0\u4EA4\u3002`,factBranch:"\u5206\u652F",factUpstream:"\u8FDC\u7A0B",factSync:"\u540C\u6B65",factSyncValue:(e,n)=>`\u2193${e} \u5F85\u62C9\u53D6 \xB7 \u2191${n} \u5F85\u63A8\u9001`,factState:"\u72B6\u6001",factConflicted:e=>`${e} \u4E2A\u51B2\u7A81\u5F85\u89E3\u51B3`,factDirty:e=>`${e} \u4E2A\u6587\u4EF6\u6709\u6539\u52A8`,factClean:"\u5E72\u51C0",worktreesHeading:"\u5DE5\u4F5C\u6811",worktreesEmpty:"\u53EA\u6709\u5F53\u524D\u8FD9\u4E00\u4EFD\u68C0\u51FA\u3002",commitMessageLabel:"\u63D0\u4EA4\u8BF4\u660E",conflictsHeading:e=>`${e} \u4E2A\u51B2\u7A81`,conflictsBody:"\u8FD9\u4E9B\u6587\u4EF6\u5728\u5408\u5E76\u4E2D\u5B58\u5728\u51B2\u7A81\uFF0C\u9700\u8981\u5148\u89E3\u51B3\uFF08\u6216\u4EA4\u7ED9 agent \u5904\u7406\uFF09\u3002",pendingHeading:e=>`\u5F85\u63D0\u4EA4\uFF08${e}\uFF09`,pendingEmpty:"\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002",refreshGit:"\u5237\u65B0",pullNow:"\u62C9\u53D6",pullNothing:"\u5DF2\u7ECF\u662F\u6700\u65B0\u7684",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Reload",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkOutside:"Points outside the workspace; not followed by default",openAnyway:"Open anyway",symlinkOutsideBody:e=>`\u201C${e}\u201D points outside the workspace. Listing reads that location, while every write stays confined to the workspace.`,symlinkBadge:"Symbolic link",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsFollowSymlinks:"Follow symbolic links inside the workspace",settingsAllowOutside:"Allow listing outside the workspace",settingsAllowOutsideHint:"Lets you browse directories outside the workspace. Writes stay inside it.",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,noRepo:"Not a Git repository",branchButtonTooltip:(e,n,t)=>`Branch ${e}${n?", with uncommitted changes":", working tree clean"}${t>0?`, ${t} conflicts`:""}`,commitButtonTooltip:(e,n)=>n===null?`${e} changes to commit`:`${e} changes to commit, ${n}`,statsSizeTooltip:e=>`Total workspace size ${e}`,branchDrawerTitle:"Branch and worktrees",branchDrawerBody:"Inspect the current branch, its remote, and every worktree on this machine.",commitDrawerTitle:"Pending changes",commitDrawerBody:e=>`${e} files are waiting to be committed.`,factBranch:"Branch",factUpstream:"Remote",factSync:"Sync",factSyncValue:(e,n)=>`${e} to pull, ${n} to push`,factState:"State",factConflicted:e=>`${e} conflicts to resolve`,factDirty:e=>`${e} files changed`,factClean:"Clean",worktreesHeading:"Worktrees",worktreesEmpty:"This is the only checkout.",commitMessageLabel:"Commit message",conflictsHeading:e=>`${e} conflicts`,conflictsBody:"These files conflict in the merge and must be resolved first, or handed to the agent.",pendingHeading:e=>`Pending (${e})`,pendingEmpty:"Nothing to commit.",refreshGit:"Refresh",pullNow:"Pull",pullNothing:"Already up to date",statusUntracked:"Untracked"}};function Xn(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function de(e){return Se[Xn(e)]}function Yt(e,n,t,r){let l={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&r!==void 0?e.statusBoth(l):t!==void 0?e.statusStaged(l):r!==void 0?e.statusUnstaged(l):l}var Vt="dsh-nano-explorer-extra:prefs.v1",Ne={openPreviewOnClick:!1,openPreviewOnDoubleClick:!0,showOpenButton:!0,followSymlinks:!0,allowOutsideWorkspace:!1,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0};function Zn(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qn(e){let n=Zn(e)?e:{},t={};for(let[r,l]of Object.entries(Ne))t[r]=typeof n[r]=="boolean"?n[r]:l;return t}function Jt(){try{let e=window.localStorage?.getItem(Vt);return e==null?{...Ne}:Qn(JSON.parse(e))}catch{return{...Ne}}}function Xt(e){try{window.localStorage?.setItem(Vt,JSON.stringify(e))}catch{}}var I=G(A("react"),1);function re({label:e,hint:n,checked:t,onChange:r,warn:l}){return I.default.createElement("div",{className:"nxe-settings-row"},I.default.createElement("div",null,I.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:I.default.createElement("div",{className:"nxe-settings-hint"},n),l===!0?I.default.createElement("p",{className:"nxe-warn"},n):null),I.default.createElement("button",{type:"button",className:"nxe-switch",role:"switch","aria-checked":t,"aria-label":e,"data-on":String(t),onClick:()=>r(!t)}))}function Zt({copy:e,prefs:n,setPref:t}){let r=n.openPreviewOnClick===!1&&n.openPreviewOnDoubleClick===!1;return I.default.createElement("div",{className:"nxe-settings","data-nxe-settings":"true"},I.default.createElement("p",{className:"nxe-settings-hint"},e.settingsDescription),I.default.createElement(re,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:n.openPreviewOnClick,onChange:l=>t("openPreviewOnClick",l)}),I.default.createElement(re,{label:e.settingsOpenOnDoubleClick,checked:n.openPreviewOnDoubleClick,onChange:l=>t("openPreviewOnDoubleClick",l)}),r?I.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,I.default.createElement(re,{label:e.settingsShowOpenButton,checked:n.showOpenButton,onChange:l=>t("showOpenButton",l)}),I.default.createElement(re,{label:e.settingsFollowSymlinks,checked:n.followSymlinks,onChange:l=>t("followSymlinks",l)}),I.default.createElement(re,{label:e.settingsAllowOutside,hint:e.settingsAllowOutsideHint,checked:n.allowOutsideWorkspace,onChange:l=>t("allowOutsideWorkspace",l)}),I.default.createElement(re,{label:e.settingsShowIgnoredBadge,checked:n.showIgnoredBadge,onChange:l=>t("showIgnoredBadge",l)}),I.default.createElement(re,{label:e.settingsShowGit,checked:n.showGitStatus,onChange:l=>t("showGitStatus",l)}),I.default.createElement(re,{label:e.settingsShowStatusBar,checked:n.showStatusBar,onChange:l=>t("showStatusBar",l)}),I.default.createElement(re,{label:e.settingsStatsExcludeGit,checked:n.statsExcludeGit,onChange:l=>t("statsExcludeGit",l)}))}var Qt=`${st}

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
.nxe-status-left, .nxe-status-right { display: flex; align-items: center; gap: 6px; min-width: 0; }
.nxe-status-right { font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }

/* One chip family for both footer controls: same height, same padding, same glyph gap, so the two
   buttons read as a pair instead of two different widgets. */
.nxe-chip {
  display: inline-flex; align-items: center; gap: 5px;
  box-sizing: border-box; height: 20px; padding: 0 7px;
  border: 1px solid transparent; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-variant-numeric: tabular-nums; line-height: 1; white-space: nowrap;
}
.nxe-chip svg { width: 14px; height: 14px; flex: none; }
.nxe-chip-label { overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.nxe-chip-count { font-weight: 600; }
.nxe-chip-sync { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.nxe-chip[data-nxe-git="none"] { color: var(--dsw-alias-label-tertiary); }
.nxe-chip-button { cursor: pointer; }
@media (hover: hover) {
  .nxe-chip-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
}
.nxe-chip-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }
/* The two flags a reader scans for: uncommitted work, and an unresolved merge. */
.nxe-chip-flag { font-weight: 700; line-height: 1; }
.nxe-chip-flag[data-kind="dirty"] { color: var(--nxe-git-modified); }
.nxe-chip-flag[data-kind="conflict"] { color: var(--dsw-alias-label-error, #e5534b); }
.nxe-chip-static { cursor: default; }

/* Each totals figure is glyph plus number; a bare number said nothing about what it counted. */
.nxe-figure { display: inline-flex; align-items: center; gap: 4px; }
.nxe-figure svg { width: 13px; height: 13px; flex: none; opacity: .8; }
.nxe-figure-value { font-variant-numeric: tabular-nums; }

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
.nxe-drawer-row-status[data-status="M"] { color: var(--nxe-git-modified); }
.nxe-drawer-row-status[data-status="A"], .nxe-drawer-row-status[data-status="?"] { color: var(--nxe-git-added); }
.nxe-drawer-row-status[data-status="D"] { color: var(--nxe-git-deleted); }
.nxe-drawer-row-status[data-status="R"] { color: var(--nxe-git-renamed); }
.nxe-drawer-row-status[data-status="U"] { color: var(--nxe-git-conflicted); }
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
.nxe-settings { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.nxe-settings-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
.nxe-settings-row:last-child { border-bottom: 0; }
.nxe-settings-label { font-size: 13px; color: var(--dsw-alias-label-primary); }
.nxe-settings-hint { margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.nxe-switch { position: relative; flex: none; width: 34px; height: 18px; border-radius: 999px; border: 0; background: var(--dsw-alias-border-l3); cursor: pointer; transition: background .12s ease; }
.nxe-switch[data-on="true"] { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); }
.nxe-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform .12s ease; }
.nxe-switch[data-on="true"]::after { transform: translateX(16px); }
.nxe-switch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 2px; }
.nxe-switch { corner-shape: round; }
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
  font-size: 11px; font-weight: 700; line-height: 1;
  display: inline-flex; align-items: center;
  color: var(--nxe-ignored-ink);
}

/* Stashed work, shown beside the branch because a clean tree can still hold a shelf. */
.nxe-stash {
  display: inline-flex; align-items: center; gap: 3px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.nxe-stash svg { width: 14px; height: 14px; flex: none; }
.nxe-stash-count { font-size: 11px; line-height: 1; }
`;var nn=G(A("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:oe,useCallback:ea,useEffect:ta,useState:na}=ut.default,aa=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"],en="nanoExplorerExtra",ra="files",Ke="nano-explorer-extra",tn={handler:void 0};function oa(){let e=Jt(),n=new Set;return{get:()=>e,set:t=>{e=t,Xt(e);for(let r of n)r()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function ia(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=Qt,document.head.append(n),e.effect(()=>()=>n.remove());let t=oa(),r=d=>e.sessions.list.getSnapshot().byId[d]?.cwd,l=d=>{tn.handler?.(d)},h=()=>e.locale.getSnapshot().active,g=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",f=()=>({copy:de(h()),prefs:t.get(),scheme:g,statusLabel:Yt,onListed:()=>{},setRenameHandler:d=>{tn.handler=d}});e.effect(()=>e.sidebarRightTabs.register({id:Ke,kind:ra,priority:"extension",title:()=>de(h()).typeLabel,guide:[{id:"explorer",order:10,title:()=>de(h()).typeLabel,description:()=>de(h()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:Ke,inject:()=>({nxe:f()})},qt)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:Ke},function({useTabInfo:s}){let{tab:i}=s();return oe(ut.default.Fragment,null,oe(nn.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),i.title)})),"nano-explorer-extra: files tab title");let x=e.get("contextMenus");if(x!=null)for(let d of["file","directory"])e.effect(()=>x.register({id:`nano-explorer-extra.${d}`,target:d,order:900,resolve:async s=>{let i=de(h()),m=s.sessionId===void 0?void 0:r(s.sessionId),b=m===void 0?s.path:Q(m,s.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:i.copyRelative,failureLabel:i.copyFailed,run:()=>sa(b)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:i.rename,failureLabel:i.renameFailed,run:()=>l?.({path:s.path,kind:d==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${d} menu`);e.slots.inject("contextMenu.icon",()=>{let d=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},la),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},da)];return()=>{for(let s of d)s()}}),e.effect(()=>e.locale.register(en,{zh:{title:Se.zh.settingsTitle,description:Se.zh.settingsDescription},en:{title:Se.en.settingsTitle,description:Se.en.settingsDescription}}),"nano-explorer-extra: dictionaries"),e.effect(()=>e.slots.inject("settings.section",()=>e.slots.register({name:"settings.section",id:Ke,order:40,locale:en,label:()=>de(h()).settingsTitle},function(){let[s,i]=na(()=>t.get());ta(()=>t.subscribe(()=>i(t.get())),[]);let m=ea((b,$)=>t.set({...t.get(),[b]:$}),[]);return oe(Zt,{copy:de(h()),prefs:s,setPref:m})})),"nano-explorer-extra: settings section")}async function sa(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function la(){return oe("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},oe("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),oe("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))}function da(){return oe("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},oe("path",{d:"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"}),oe("path",{d:"M13.5 6.5 17.5 10.5"}))}return Dn(ca);})();
		return __nxeExport;
	}
});
