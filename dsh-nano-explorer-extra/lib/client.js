window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var pn=Object.create;var Ae=Object.defineProperty;var mn=Object.getOwnPropertyDescriptor;var hn=Object.getOwnPropertyNames;var fn=Object.getPrototypeOf,gn=Object.prototype.hasOwnProperty;var A=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var xn=(e,n)=>{for(var t in n)Ae(e,t,{get:n[t],enumerable:!0})},ft=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let l of hn(n))!gn.call(e,l)&&l!==t&&Ae(e,l,{get:()=>n[l],enumerable:!(r=mn(n,l))||r.enumerable});return e};var U=(e,n,t)=>(t=e!=null?pn(fn(e)):{},ft(n||!e||!e.__esModule?Ae(t,"default",{value:e,enumerable:!0}):t,e)),wn=e=>ft(Ae({},"__esModule",{value:!0}),e);var Jn={};xn(Jn,{DEFAULT_PREFS:()=>ye,apply:()=>_n,inject:()=>Wn});var ot=U(A("react"),1);var p=U(A("react"),1);var H=U(A("react"),1),tt=A("@deepseek-ai/dsh-client-ui-primitives");var se=U(A("react"),1),Se=A("@deepseek-ai/dsh-client-ui-primitives");function Ve({copy:e,title:n,description:t,confirmLabel:r,confirmDisabled:l,busy:m,error:g,danger:h,footer:x,maxHeight:c,width:s,region:i,onConfirm:f,onCancel:v,children:M}){return se.default.createElement(Se.Modal,{open:!0,onClose:v,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",c===void 0?"":"nano-dialog-capped",s===void 0?"":"nano-dialog-sized",i===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:x??se.default.createElement(se.default.Fragment,null,se.default.createElement(Se.Button,{variant:"outline",className:"nano-modal-action",onClick:v},e.cancel),se.default.createElement(Se.Button,{variant:h?"danger":"primary",className:"nano-modal-action",disabled:l===!0||m===!0,onClick:f},r??e.confirm))},M,g===void 0?null:se.default.createElement("p",{className:"nano-dialog-error",role:"alert"},g))}var le=U(A("react"),1),{useCallback:Zn,useEffect:gt,useRef:xt,useState:bn}=le.default;function Ze({menu:e,actions:n,onClose:t,width:r=208}){let l=xt(null),[m,g]=bn(0),h=e===null?[]:n,x=h.length,c=xt(h);c.current=h;let s=e===null?null:e.openedAt;if(gt(()=>{s!==null&&g(0)},[s]),gt(()=>{if(e===null)return;let M=D=>{l.current!==null&&!l.current.contains(D.target)&&t()},q=D=>{if(D.key==="Escape"){D.stopPropagation(),t();return}if(D.key==="ArrowDown"){D.preventDefault(),g(ne=>(ne+1)%x);return}if(D.key==="ArrowUp"){D.preventDefault(),g(ne=>(ne-1+x)%x);return}D.key==="Enter"&&(D.preventDefault(),t(),c.current[m]?.run())};return document.addEventListener("pointerdown",M,!0),document.addEventListener("keydown",q,!0),()=>{document.removeEventListener("pointerdown",M,!0),document.removeEventListener("keydown",q,!0)}},[e,m,x,t]),e===null||x===0)return null;let i=x*28+8,f=Math.min(e.x,(window.innerWidth||r)-r-8),v=Math.min(e.y,(window.innerHeight||i)-i-8);return le.default.createElement("div",{className:"nano-menu",role:"menu",ref:l,style:{position:"fixed",left:`${Math.max(8,f)}px`,top:`${Math.max(8,v)}px`,minWidth:`${r}px`},"data-nano-menu":"true"},h.map((M,q)=>le.default.createElement(wt,{key:M.id,item:M,index:q,active:q===m,onHover:g,onRun:t})))}function wt({item:e,index:n,active:t,onHover:r,onRun:l}){return le.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>r(n),onClick:()=>{l(),e.run()}},e.icon===void 0?null:le.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),le.default.createElement("span",{className:"nano-menu-label"},e.label))}var bt=U(A("react"),1);function Qe({text:e}){return e==null?null:bt.default.createElement("div",{className:"nano-toast",role:"status","aria-live":"polite","data-nano-toast":"true"},e)}var et=`
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
`;var{useState:yt}=H.default;function Oe(e){return H.default.createElement(Ve,e)}function vt({children:e}){return H.default.createElement("div",{className:"nxe-dialog-field"},e)}function kt({copy:e,files:n,busy:t,error:r,onConfirm:l,onCancel:m}){let[g,h]=yt(""),x=g.trim()==="";return H.default.createElement(Oe,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:x,busy:t,error:r,onConfirm:()=>l(g),onCancel:m,description:e.commitBody(n.length)},H.default.createElement(vt,null,H.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(c=>H.default.createElement("li",{key:c.path,title:c.path},`${c.status} ${c.path}`))),H.default.createElement(tt.Input,{value:g,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:c=>h(c.currentTarget.value)})))}function nt({copy:e,currentName:n,busy:t,error:r,onConfirm:l,onCancel:m,mode:g="rename"}){let[h,x]=yt(n),c=h.trim()==="",s=g==="create";return H.default.createElement(Oe,{copy:e,title:s?e.newEntryTitle:e.renameTitle,confirmLabel:s?e.create:e.confirm,busy:t,error:r,confirmDisabled:c,onConfirm:()=>l(h),onCancel:m,description:s?e.newEntryBody(n):e.renameBody(n)},H.default.createElement(vt,null,H.default.createElement(tt.Input,{value:h,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:i=>x(i.currentTarget.value),onKeyDown:i=>{i.key==="Enter"&&!c&&(i.preventDefault(),l(h))}})))}var F=U(A("react"),1);function Et(e){return function({entry:t}){let r=e.copy(),l=e.statusOf(t.path),m=e.ignoredOf(t.path),g=e.linkOf(t.path),h=t.meta?.kind!=="directory",x=h?void 0:e.folderStatusOf(t.path),c=e.showGit()&&!m,s=c?e.stagedOf(t.path):void 0,i=c?e.unstagedOf(t.path):void 0,f=c?e.remoteOf(t.path):void 0;return F.default.createElement("span",{className:"nxe-acc",...m?{"data-nxe-ignored":"true"}:{}},g===void 0?null:F.default.createElement("span",{className:"nxe-acc-link",title:g?r.symlinkOutside:r.symlinkBadge,"aria-label":g?r.symlinkOutside:r.symlinkBadge,"data-nxe-symlink":g?"outside":"inside"},F.default.createElement("svg",{viewBox:"0 0 24 24",width:11,height:11,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round","aria-hidden":"true"},F.default.createElement("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),F.default.createElement("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))),f===void 0?null:F.default.createElement("span",{className:"nxe-acc-remote","data-status":f.status,"data-direction":f.direction,title:f.direction==="pulled"?r.remotePulled(f.status):r.remotePushed(f.status),"aria-label":f.direction==="pulled"?r.remotePulled(f.status):r.remotePushed(f.status)},`${f.direction==="pulled"?"\u2193":"\u2191"}${f.status}`),c&&l!==void 0?F.default.createElement("span",{className:"nxe-acc-letter","data-status":l,"data-staged":s===void 0?"false":"true",title:e.statusLabel(l,s,i),"aria-label":e.statusLabel(l,s,i)},l):null,c&&x!==void 0?F.default.createElement("span",{className:"nxe-acc-dot","data-status":x,title:e.statusLabel(x),"aria-label":e.statusLabel(x)}):null,m?F.default.createElement("span",{className:"nxe-acc-ignored-letter","data-status":"!",title:r.ignoredBadge,"aria-label":r.ignoredBadge},"!"):null,h&&e.showOpenButton()?F.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:r.openFile,"aria-label":`${r.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:v=>{v.stopPropagation(),e.open(t)}},F.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},F.default.createElement("path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}),F.default.createElement("path",{d:"M15 3h6v6"}),F.default.createElement("path",{d:"M10 14 21 3"}))):null)}}var N=U(A("react"),1);function at(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,r=0;for(;t>=1024&&r<n.length-1;)t/=1024,r+=1;return`${r===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[r]}`}function St(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}var de=A("@deepseek-ai/dsh-client-ui-primitives");function Ot(e){let{copy:n,git:t,stats:r,statsState:l,prefs:m,onCommit:g,onRefreshGit:h,onRetryStats:x}=e;if(!m.showStatusBar)return null;let c=[];if(t==null)c.push(N.default.createElement("span",{key:"norepo",className:"nxe-branch","data-nxe-git":"none"},N.default.createElement(de.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),N.default.createElement("span",{className:"nxe-branch-name"},n.notRepo)));else{let i=t.detached?n.detached:t.branch??n.detached;c.push(N.default.createElement("span",{key:"branch",className:"nxe-branch","data-nxe-git":"ready","data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:t.upstream===null?i:n.branchTooltip(i,t.upstream)},N.default.createElement(de.IconBranchOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-branch-name","data-nxe-branch":t.branch??""},i))),typeof t.stashed=="number"&&t.stashed>0&&c.push(N.default.createElement("span",{key:"stash",className:"nxe-stash","data-nxe-stash":String(t.stashed),title:n.stashBadge(t.stashed),"aria-label":n.stashBadge(t.stashed)},N.default.createElement(de.IconArchiveOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-stash-count"},String(t.stashed))));let f=(t.files?.length??0)>0,v=f?n.commitTooltip:n.commitTooltipNone;t.upstream!==null&&t.upstream!==void 0?c.push(N.default.createElement("button",{key:"sync",type:"button",className:"nxe-sync","data-nxe-sync":"true","data-ahead":String(t.ahead??0),"data-behind":String(t.behind??0),title:n.syncTooltip(t.ahead??0,t.behind??0,t.upstream),"aria-label":n.syncTooltip(t.ahead??0,t.behind??0,t.upstream),onClick:h},N.default.createElement(de.IconRefreshOutlineRegular,{width:14,height:14}),N.default.createElement("span",{className:"nxe-sync-counts"},St(t.ahead??0,t.behind??0)))):c.push(N.default.createElement("span",{key:"nosync",className:"nxe-sync","data-nxe-sync":"none",title:n.noUpstream,"aria-label":n.noUpstream},n.noUpstream)),c.push(N.default.createElement("button",{key:"commit",type:"button",className:"nxe-commit",disabled:!f,title:v,"data-nxe-commit":"true",onClick:g},n.commit))}let s=[];if(l==="loading")s.push(N.default.createElement("span",{key:"loading"},n.statsLoading));else if(l==="failed")s.push(N.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:x},n.statsFailed));else if(r!=null){let i=`${n.statsTooltip(r.files,r.directories,at(r.bytes))}${r.truncated?` \xB7 ${n.truncated}`:""}${m.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:""}`;s.push(N.default.createElement("span",{key:"files",title:i,"data-nxe-stats":"true"},`${r.files}${r.truncated?"+":""} \xB7 ${r.directories} \xB7 ${at(r.bytes)}`))}return N.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},N.default.createElement("div",{className:"nxe-status-left"},c),N.default.createElement("div",{className:"nxe-status-right"},s))}var Nt=U(A("react"),1);function Tt({menu:e,actions:n,onClose:t}){return Nt.default.createElement(Ze,{menu:e,actions:n,onClose:t})}var I=U(A("@deepseek-ai/dsh-client-ui-primitives"),1);var $t=U(A("react"),1);function ce(e,n){let t=Z(e),r=String(n??"").replace(/\\/gu,"/");return r===""?t:r.startsWith("/")||/^[A-Za-z]:\//u.test(r)?Z(r):`${t==="/"?"":t}/${r}`.replace(/\/{2,}/gu,"/")}function G(e,n){return Z(ce(e,n))}function yn(e,n){let t=Z(e),r=Z(n);return t===r?!0:r.startsWith(t==="/"?"/":`${t}/`)}function J(e,n){let t=Z(e),r=Z(n);return r===t?"":yn(t,r)?r.slice(t==="/"?1:t.length+1):r}function Le(e){let n=Z(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Ne(e){let n=Z(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function Z(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:ue,useEffect:Ct,useMemo:Rt,useRef:Te,useState:Ce}=$t.default;function Bt(e){let{sessionId:n,root:t,request:r,prefs:l,onListed:m}=e,[g,h]=Ce(()=>new Map),[x,c]=Ce(()=>new Set),s=Te(x);s.current=x;let[i,f]=Ce(null),[v,M]=Ce(null),[q,D]=Ce(0),ne=Te(!0),$e=Te(m);$e.current=m,Ct(()=>()=>{ne.current=!1},[]);let _=ue(async(y,w=!1,k=void 0)=>{let S=G(t,y);w||h(X=>{let P=new Map(X);return P.get(S)===void 0&&P.set(S,{loading:!0,entries:[]}),P});let E=await r("/list",{sessionId:n,path:y,followSymlinks:l.followSymlinks,allowOutsideWorkspace:k===!0||l.allowOutsideWorkspace===!0||l.allowed?.includes(G(t,y))===!0});if(ne.current)return h(X=>{let P=new Map(X),V=P.get(S);return E.ok?P.set(S,{entries:E.entries,truncated:E.truncated===!0,outside:E.outside===!0,failed:V?.failed===!0&&V.entries?.length>0?V.failed:!1}):P.set(S,{entries:V?.entries??[],failed:!0,message:E.message,code:E.code}),P}),$e.current?.(y,E.ok?E.entries.map(X=>X.name):[]),E},[t,n,r,l.followSymlinks,l.allowOutsideWorkspace,l.allowed]),pe=Te(void 0),re=Te([]);Ct(()=>{if(t!==void 0){if(pe.current!==t){pe.current=t,h(new Map),c(new Set),_(t);return}_(t,!0);for(let y of re.current)_(y,!0)}},[t,q,_]);let K=ue(async()=>{re.current=[...s.current],D(y=>y+1)},[]),me=ue(y=>_(y,!0),[_]),Y=ue((y,w)=>{let k=G(t,y);c(S=>{let E=new Set(S);return w?E.add(k):E.delete(k),E}),w&&g.get(k)===void 0&&_(y)},[t,g,_]),Be=ue(y=>{let w=G(t,y);h(k=>{if(k.has(w))return k;let S=new Map(k);return S.set(w,{entries:[]}),S})},[t]),z=ue(y=>{let w=G(t,y);h(k=>{if(!k.has(w))return k;let S=new Map(k);return S.delete(w),S})},[t]),ve=ue(y=>{let w=G(t,y);c(k=>{let S=new Set;for(let E of k)E!==w&&!E.startsWith(`${w}/`)&&S.add(E);return S}),h(k=>{let S=new Map;for(let[E,X]of k)E!==w&&!E.startsWith(`${w}/`)&&S.set(E,X);return S})},[t]),ke=Rt(()=>{let y=[];for(let[w,k]of g)for(let S of k.entries??[]){let E=w===""?S.name:`${w}/${S.name}`;y.push({...S,path:E})}return y},[g]),Ge=Rt(()=>{let y={};for(let[w,k]of g)k.loading===!0&&(k.entries?.length??0)===0?y[w]={loading:!0}:k.failed===!0?y[w]={failure:k.message}:k.truncated===!0&&(y[w]={truncated:!0});return y},[g]);return{levels:g,entries:ke,directories:Ge,expanded:[...x],selected:i,setSelected:f,toggle:Y,pending:v,setPending:M,refresh:K,refreshLevel:me,loadLevel:_,forget:z,collapseUnder:ve,knownEmpty:Be}}var vn=".md";function It(e,n){let t=e==="file"?"untitled":"new-folder",r=new Set((n??[]).map(m=>String(m.name??"").toLowerCase())),l=m=>e==="file"?`${t}${m===1?"":`-${m}`}${vn}`:`${t}${m===1?"":`-${m}`}`;for(let m=1;m<1e4;m+=1){let g=l(m);if(!r.has(g.toLowerCase()))return g}throw new Error("cannot find an unused name")}function Dt(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:O,useEffect:Re,useMemo:Q,useRef:we,useState:B}=p.default,kn=400,En=["U","D","M","A","R","?"],Sn=new Set([".git",".DS_Store"]);function At(e){let{useTabInfo:n,sessionId:t,useSessions:r,renderSlot:l,renderFactorySlot:m,useContextMenu:g,nxe:h}=e,{tab:x,panel:c}=n(),s=r(a=>a.byId[t]?.cwd),i=h.copy,f=h.prefs,[v,M]=B(null),[q,D]=B(void 0),[ne,$e]=B(null),[_,pe]=B("idle"),[re,K]=B(null),[me,Y]=B(!1),[Be,z]=B(void 0),ve=we(new Set),[ke,Ge]=B(()=>new Set),[y,w]=B(void 0),[k,S]=B(void 0),[E,X]=B([]);Re(()=>{let a=!0;return(async()=>{try{let o=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!o.ok)return;let d=await o.json(),b=Array.isArray(d.apps)?d.apps:[];a&&X(b.filter(T=>typeof T=="string"))}catch{}})(),()=>{a=!1}},[]);let[P,V]=B(null),[R,rt]=B(null),[Ie,ze]=B(null),Ue=we(0),[We,je]=B(null),[He,Ht]=B(()=>new Map),it=we({path:"",at:0}),he=we(f);he.current=f;let $=O(async(a,o)=>{try{let d=await fetch(`/nano-explorer-extra${a}`,{method:o===void 0?"GET":"POST",headers:o===void 0?void 0:{"content-type":"application/json"},body:o===void 0?void 0:JSON.stringify(o),credentials:"same-origin",cache:"no-store"}),b=await d.json().catch(()=>({error:`HTTP ${d.status}`}));return d.ok?{ok:!0,...b}:{ok:!1,message:b?.error??`HTTP ${d.status}`}}catch(d){return{ok:!1,message:d instanceof Error?d.message:String(d)}}},[]),_t=O(async(a,o)=>{if(!he.current.showGitStatus||!Array.isArray(o)||o.length===0)return;let d=await $("/ignored",{sessionId:t,paths:o});!d.ok||!Array.isArray(d.ignored)||d.ignored.length===0||qt(b=>{let T=new Set(b),L=J(s??"",a);for(let j of d.ignored)T.add(L===""?j:`${L}/${j}`);return T})},[$,t,s]),st=Q(()=>[...ke],[ke]),Kt=Q(()=>({...f,allowed:st}),[f,st]),u=Bt({sessionId:t,root:s,request:$,prefs:Kt,onListed:(a,o)=>{_t(a,o)}}),fe=O(async()=>{if(s===void 0)return;if(!he.current.showGitStatus){M(null),D(void 0);return}let a=await $(`/status?sessionId=${encodeURIComponent(t)}`);if(!a.ok){D(a.message);return}M(a.git??null),D(a.gitError)},[s,t,$]),ie=O(async()=>{if(s===void 0)return;pe("loading");let a=await $(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!a.ok){pe("failed");return}$e(a.stats??null),pe("ok")},[s,t,$]);Re(()=>{fe()},[fe]),Re(()=>{ie()},[s]);let _e=we(0),ge=O(()=>{window.clearTimeout(_e.current),_e.current=window.setTimeout(()=>{ie()},2e3)},[ie]);Re(()=>()=>{window.clearTimeout(_e.current),window.clearTimeout(Ue.current)},[]);let Ke=Q(()=>Array.isArray(v?.files)?v.files:[],[v]),qe=Q(()=>{let a=new Map;for(let o of Ke)a.set(o.path,o);return a},[Ke]),[Ye,qt]=B(()=>new Set),xe=v?.root,lt=we(xe);lt.current=xe;let ae=Q(()=>{if(He.size===0)return qe;let a=new Map(qe);for(let[o,d]of He)a.set(o,d);return a},[qe,He]),W=O(a=>{if(xe==null)return;let o=ce(s??"",a);return J(xe,o)},[xe,s]),Je=O(a=>{let o=W(a);if(o===void 0)return!1;if(Ye.has(o))return!0;let d=o.split("/");for(let b=d.length-1;b>0;b-=1)if(Ye.has(d.slice(0,b).join("/")))return!0;return!1},[Ye,W]),dt=O(a=>{let o=W(a);if(o!==void 0)return ae.get(o)?.status},[ae,W]),Yt=O(a=>{let o=W(a);if(o!==void 0)return ae.get(o)?.staged},[ae,W]),Jt=O(a=>{let o=W(a);if(o!==void 0)return ae.get(o)?.unstaged},[ae,W]),ct=Q(()=>{let a=new Map;for(let o of v?.remote?.pushed??[])a.set(o.path,{status:o.status,direction:"pushed"});for(let o of v?.remote?.pulled??[])a.set(o.path,{status:o.status,direction:"pulled"});return a},[v]),Xt=O(a=>{let o=W(a);if(o!==void 0)return ct.get(o)},[ct,W]),Ee=O(a=>{let o=ce(s??"",a.path),d=`dsh-resource://file/session/${encodeURIComponent(t)}/${o.replace(/^\/+/,"").split("/").map(encodeURIComponent).join("/")}`;c.isFloating?x.actions.openResource(d):x.actions.openResource(d,{paneId:c.id})},[s,t,x.actions,c.id,c.isFloating]),ut=O(async a=>{if(s===void 0||!he.current.showGitStatus)return;let o=await $(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(a)}`);if(!o.ok||o.git===null||o.git===void 0)return;let d=o.git.root;Ht(b=>{let T=new Map(b);for(let L of o.git.files??[]){let j=d===void 0?L.path:`${d.replace(/\/+$/u,"")}/${L.path}`,De=lt.current??s,ht=J(De,j);ht!==j&&T.set(ht,L)}return T})},[s,t,$]),Vt=O(async a=>{let o=await u.loadLevel(a.path);if(o?.ok){u.toggle(a.path,!0),ut(a.path);return}if(o?.code!=="outside-workspace"){u.toggle(a.path,!0);return}je({path:a.path,name:a.name})},[u,ut]),Zt=O(async a=>{Y(!0);let o=await $("/delete",{sessionId:t,path:a.path,kind:a.kind==="directory"?"directory":"file"});if(Y(!1),!o.ok){w(o.message);return}ze(null),w(void 0),u.forget(a.path),u.collapseUnder(a.path);let d=Le(a.path);d!==a.path&&await u.refreshLevel(d),u.selected===a.path&&u.setSelected(null),ge()},[t,$,u,ge]),pt=O(a=>{if(s===void 0)return;let o=On(u,s),d=Nn(u,s,o);w(void 0),V({kind:a,directory:o,proposed:It(a,d)})},[s,u]),Qt=O(async a=>{if(P===null)return;let{kind:o,directory:d}=P,b=Dt(a,i);if(!b.ok){w(b.message);return}Y(!0);let T=await $(o==="file"?"/create-file":"/create-folder",{sessionId:t,directory:d,name:b.name});if(Y(!1),!T.ok){w(T.message);return}V(null),w(void 0),await u.refreshLevel(d);let L=J(s??"",d),j=ce(s??"",`${L===""?"":`${L}/`}${b.name}`);u.setSelected(j),o==="folder"&&(u.knownEmpty(j),u.toggle(j,!0)),ge()},[P,i,s,t,$,u,ge]),en=O(async(a,o)=>{if(s===void 0)return;let d=ce(s,a.path),b=a.meta?.kind==="directory"?"directory":"file";Y(!0),z(void 0);let T=await $("/rename",{sessionId:t,path:d,name:o,kind:b});if(Y(!1),!T.ok){z(T.message);return}K(null);let L=Le(d);await u.refreshLevel(L),b==="directory"&&u.collapseUnder(d),u.setSelected(ce(s,`${J(s,L)===""?"":`${J(s,L)}/`}${o.trim()}`)),ge()},[s,t,$,u,ge]),tn=O(async a=>{Y(!0),z(void 0);let o=await $("/commit",{sessionId:t,message:a});if(Y(!1),!o.ok){z(o.message);return}K(null),await u.refresh(),await fe(),await ie()},[t,$,u,fe,ie]),Xe=O(async(a,o)=>{try{await navigator.clipboard.writeText(o||a),S(i.copied),window.clearTimeout(Ue.current),Ue.current=window.setTimeout(()=>S(void 0),1600)}catch(d){w(d instanceof Error?d.message:String(d))}},[i.copied]),nn=O((a,o)=>({onContextMenu:d=>{d.preventDefault(),d.stopPropagation(),u.setSelected(a.path),rt({x:d.clientX,y:d.clientY,path:a.path,name:a.name,kind:o,openedAt:Date.now()})}}),[u]),an=O(a=>{let o=W(a);if(o===void 0)return;let d=o===""?"":`${o}/`,b,T=-1;for(let[L,j]of ae){if(d!==""&&!L.startsWith(d))continue;let De=En.indexOf(j.status);De>T&&(T=De,b=j.status)}return b},[ae,W]),mt=Q(()=>Et({copy:()=>i,statusOf:dt,stagedOf:Yt,unstagedOf:Jt,remoteOf:Xt,ignoredOf:Je,folderStatusOf:an,linkOf:a=>u.levels.get(G(s??"",a))?.outside===!0?!0:void 0,showGit:()=>f.showGitStatus,showIgnoredBadge:()=>f.showIgnoredBadge,showOpenButton:()=>f.showOpenButton,statusLabel:a=>h.statusLabel(i,a),open:a=>Ee(a)}),[i,dt,Je,u.levels,s,f.showGitStatus,f.showIgnoredBadge,f.showOpenButton,h,Ee]),on=Q(()=>({slots:{accessory:mt},fallback:null}),[mt]);if(s===void 0)return p.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},i.noWorkspace);let rn=u.entries.filter(a=>!Sn.has(a.name)).map(a=>({path:a.path,name:a.name,meta:{kind:a.type==="directory"?"directory":a.type==="file"?"file":"other",...a.symlink===!0?{link:!0}:{},...a.outside===!0?{outside:!0}:{},...Je(a.path)?{hidden:!0}:{}}})),sn=m("sidebar.files.tree",{root:G(s,s),entries:rn,expanded:u.expanded,directories:u.directories,current:u.selected===null?void 0:G(s,u.selected),onToggle:a=>{if(u.expanded.includes(a.path)){u.toggle(a.path,!1);return}if(ke.has(a.path)){u.toggle(a.path,!0);return}Vt(a)},onOpen:a=>{u.setSelected(a.path);let o=Date.now(),d=it.current,b=d.path===a.path&&o-d.at<=kn;it.current={path:a.path,at:o},(b?he.current.openPreviewOnDoubleClick:he.current.openPreviewOnClick)&&Ee(a)},rowTriggerProps:nn,canOpen:()=>!0},on);Re(()=>{let a=o=>{z(void 0),K({kind:"rename",entry:{path:o.path,name:Ne(o.path),meta:{kind:o.kind}}})};return h.setRenameHandler(a),()=>h.setRenameHandler(void 0)},[h]);let ln=O(a=>{if(u.pending!==null)return;if(a.key==="F2"&&u.selected!==null){a.preventDefault(),z(void 0),K({kind:"rename",entry:{path:u.selected,name:Ne(u.selected),meta:{kind:u.levels.has(u.selected)?"directory":"file"}}});return}let o=u.selected;if(o===null)return;let d=G(s??"",o),b=u.levels.has(d)||u.expanded.includes(d);if(a.key===" "){if(!b)return;a.preventDefault(),u.toggle(o,!u.expanded.includes(d));return}if(a.key==="Enter"){if(a.preventDefault(),b){u.toggle(o,!u.expanded.includes(d));return}Ee({path:d,name:Ne(o),meta:{kind:"file"}})}},[u,s,Ee]),dn=We===null?null:p.default.createElement(Oe,{copy:i,title:i.symlinkOutside,confirmLabel:i.openAnyway,onConfirm:()=>{let a=We.path;ve.current=new Set(ve.current).add(a),Ge(new Set(ve.current)),je(null),u.loadLevel(a,!1,!0).then(()=>u.toggle(a,!0))},onCancel:()=>je(null),description:i.symlinkOutsideBody(We.name)}),cn=re===null?null:re.kind==="commit"?p.default.createElement(kt,{copy:i,files:Ke,busy:me,error:Be,onConfirm:tn,onCancel:()=>{K(null),z(void 0)}}):p.default.createElement(nt,{copy:i,currentName:re.entry.name,busy:me,error:Be,onConfirm:a=>en(re.entry,a),onCancel:()=>{K(null),z(void 0)}}),un=Q(()=>{if(R===null)return[];let a={path:R.path,name:R.name,kind:R.kind},o=E[0],d=b=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:b,path:R.path}),credentials:"same-origin"})};return[o===void 0?null:{id:"reveal",label:i.revealIn(Me[o]??o),icon:p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14}),run:()=>{d(o)}},{id:"copy-path",label:i.copyAbsolute,icon:p.default.createElement(I.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{Xe(R.path,R.path)}},{id:"copy-relative",label:i.copyRelative,icon:p.default.createElement(I.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{Xe(R.path,J(s??"",R.path))}},R.kind!=="file"||window.__nanoNotepad===void 0?null:{id:"open-in-notepad",label:i.openInNotepad,icon:p.default.createElement(I.IconEditOutlineRegular,{width:14,height:14}),run:async()=>{let b=await $("/read",{sessionId:t,path:R.path});if(!b.ok){w(b.message??i.openInNotepadFail);return}w(void 0);let T=R.path.startsWith("/")?R.path:`${s??""}/${R.path}`;await window.__nanoNotepad.import(R.name,b.content,{sourcePath:T})}},{id:"rename",label:i.rename,icon:p.default.createElement(I.IconEditOutlineRegular,{width:14,height:14}),run:()=>{z(void 0),K({kind:"rename",entry:{...a,meta:{kind:R.kind}}})}},{id:"delete",label:i.delete,tone:"danger",icon:p.default.createElement(I.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{w(void 0),ze(a)}}].filter(Boolean)},[R,i,E,s,Xe]);return p.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":h.scheme()},p.default.createElement("div",{className:"nxe-header"},p.default.createElement("span",{className:"nxe-path",title:s,"data-nxe-path":"true"},s),p.default.createElement(Fe,{label:i.newFile,onClick:()=>{pt("file")}},Bn()),p.default.createElement(Fe,{label:i.newFolder,onClick:()=>{pt("folder")}},In()),p.default.createElement(Fe,{label:i.rename,disabled:u.selected===null,onClick:()=>{let a=u.selected;a!==null&&(z(void 0),K({kind:"rename",entry:{path:a,name:Ne(a),meta:{kind:u.levels.has(a)?"directory":"file"}}}))}},An()),p.default.createElement(Ln,{copy:i,cwd:s??"",apps:E}),p.default.createElement(Fe,{label:i.reload,onClick:()=>{u.refresh(),fe(),ie()}},Dn())),y===void 0?null:p.default.createElement("p",{className:"nxe-row-note",role:"status"},y),q===void 0?null:p.default.createElement("p",{className:"nxe-row-note nxe-note-error"},q),Ie===null?null:p.default.createElement(Oe,{copy:i,title:i.deleteTitle,busy:me,confirmLabel:i.delete,onConfirm:()=>{Zt(Ie)},onCancel:()=>{ze(null),w(void 0)},description:p.default.createElement(p.default.Fragment,null,i.deleteBody(Ie.name),Ie.kind==="directory"?p.default.createElement("span",{className:"nxe-dialog-note-inline"},` ${i.deleteFolderNote}`):null)}),P===null?null:p.default.createElement(nt,{copy:i,mode:"create",busy:me,currentName:P.proposed,onConfirm:a=>{Qt(a)},onCancel:()=>{V(null),w(void 0)}}),p.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:ln},sn),p.default.createElement(Qe,{text:k}),p.default.createElement(Ot,{copy:i,git:v,stats:ne,statsState:_,prefs:f,onCommit:()=>{z(void 0),K({kind:"commit"})},onRefreshGit:()=>{fe()},onRetryStats:()=>{ie()}}),cn,dn,p.default.createElement(Tt,{menu:R,copy:i,actions:un,onClose:()=>rt(null)}))}function Fe({label:e,onClick:n,children:t,disabled:r}){return p.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:r===!0},t)}function On(e,n){let t=e.selected;if(t===null)return n;let r=G(n,t);return e.levels.has(r)?r:Le(r)}function Nn(e,n,t){return e.levels.get(G(n,t))?.entries??[]}var Tn=I.IconPlusOutlineRegular,Cn=I.IconFolderCloseRegular,Rn=I.IconEditOutlineRegular,$n=I.IconRefreshOutlineRegular;function Bn(){return p.default.createElement(Tn,{width:16,height:16})}function In(){return p.default.createElement(Cn,{width:16,height:16})}function Dn(){return p.default.createElement($n,{width:16,height:16})}function An(){return p.default.createElement(Rn,{width:16,height:16})}function Ln({copy:e,cwd:n,apps:t}){let r=Array.isArray(t)?t:[];if(n===""||r.length===0)return null;let[l,m]=p.default.useState(r[0]),[g,h]=p.default.useState(!1),x=p.default.useRef(null),c=r.includes(l)?l:r[0];p.default.useEffect(()=>{if(!g)return;let i=v=>{x.current!==null&&!x.current.contains(v.target)&&h(!1)},f=v=>{v.key==="Escape"&&h(!1)};return document.addEventListener("pointerdown",i,!0),document.addEventListener("keydown",f,!0),()=>{document.removeEventListener("pointerdown",i,!0),document.removeEventListener("keydown",f,!0)}},[g]);let s=i=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:i,path:n}),credentials:"same-origin"})};return p.default.createElement("span",{className:"nxe-reveal",ref:x,"data-nxe-reveal":c},p.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(Me[c]??c),"aria-label":e.revealIn(Me[c]??c),onClick:()=>{s(c)}},p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(c)}`,alt:"",width:14,height:14})),p.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),p.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(g),onClick:()=>h(i=>!i)},p.default.createElement("svg",{viewBox:"0 0 10 10",width:10,height:10,fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round","aria-hidden":"true"},p.default.createElement("path",{d:"M2.5 4L5 6.5 7.5 4"}))),g?p.default.createElement("div",{className:"nano-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},r.map(i=>p.default.createElement("button",{key:i,type:"button",role:"menuitem",className:"nano-menu-item",onClick:()=>{m(i),h(!1),s(i)}},p.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(i)}`,alt:"",width:14,height:14})),p.default.createElement("span",{className:"nano-menu-label"},Me[i]??i)))):null)}var Me={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var be={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",openInNotepad:"\u590D\u5236\u5230 notepad \u4E2D\u6253\u5F00",openInNotepadFail:"\u8BFB\u53D6\u5931\u8D25\uFF0C\u672A\u5BFC\u5165",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkOutside:"\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF0C\u9ED8\u8BA4\u4E0D\u8DDF\u968F",openAnyway:"\u4ECD\u7136\u6253\u5F00",symlinkOutsideBody:e=>`\u300C${e}\u300D\u6307\u5411\u5DE5\u4F5C\u533A\u4EE5\u5916\u3002\u5217\u76EE\u5F55\u4F1A\u8BFB\u53D6\u90A3\u4E2A\u4F4D\u7F6E\u7684\u5185\u5BB9\uFF0C\u4F46\u4EFB\u4F55\u5199\u5165\u4ECD\u7136\u88AB\u9650\u5236\u5728\u5DE5\u4F5C\u533A\u5185\u3002`,symlinkBadge:"\u8F6F\u94FE\u63A5",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsFollowSymlinks:"\u8DDF\u968F\u5DE5\u4F5C\u533A\u5185\u7684\u8F6F\u94FE\u63A5",settingsAllowOutside:"\u5141\u8BB8\u8D8A\u8FC7\u5DE5\u4F5C\u533A\u8FB9\u754C\u5217\u76EE\u5F55",settingsAllowOutsideHint:"\u5F00\u542F\u540E\u53EF\u4EE5\u6D4F\u89C8\u6307\u5411\u5DE5\u4F5C\u533A\u5916\u7684\u76EE\u5F55\u3002\u5199\u5165\u4ECD\u7136\u88AB\u9650\u5236\u5728\u5DE5\u4F5C\u533A\u5185\u3002",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusStaged:e=>`${e}\uFF08\u5DF2\u6682\u5B58\uFF09`,statusUnstaged:e=>`${e}\uFF08\u672A\u6682\u5B58\uFF09`,statusBoth:e=>`${e}\uFF08\u90E8\u5206\u5DF2\u6682\u5B58\uFF09`,remotePushed:e=>`\u672C\u5730\u5DF2\u63D0\u4EA4\u672A\u63A8\u9001\uFF1A${e}`,remotePulled:e=>`\u8FDC\u7AEF\u5DF2\u63D0\u4EA4\u672A\u62C9\u53D6\uFF1A${e}`,stashBadge:e=>`\u6709 ${e} \u4E2A stash`,statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Reload",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",openInNotepad:"Copy to notepad",openInNotepadFail:"Read failed; not imported",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkOutside:"Points outside the workspace; not followed by default",openAnyway:"Open anyway",symlinkOutsideBody:e=>`\u201C${e}\u201D points outside the workspace. Listing reads that location, while every write stays confined to the workspace.`,symlinkBadge:"Symbolic link",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsFollowSymlinks:"Follow symbolic links inside the workspace",settingsAllowOutside:"Allow listing outside the workspace",settingsAllowOutsideHint:"Lets you browse directories outside the workspace. Writes stay inside it.",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusStaged:e=>`${e} (staged)`,statusUnstaged:e=>`${e} (unstaged)`,statusBoth:e=>`${e} (partly staged)`,remotePushed:e=>`Committed locally, not pushed: ${e}`,remotePulled:e=>`Committed upstream, not pulled: ${e}`,stashBadge:e=>`${e} stashed`,statusUntracked:"Untracked"}};function Fn(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function oe(e){return be[Fn(e)]}function Lt(e,n,t,r){let l={M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n;return t!==void 0&&r!==void 0?e.statusBoth(l):t!==void 0?e.statusStaged(l):r!==void 0?e.statusUnstaged(l):l}var Ft="dsh-nano-explorer-extra:prefs.v1",ye={openPreviewOnClick:!1,openPreviewOnDoubleClick:!0,showOpenButton:!0,followSymlinks:!0,allowOutsideWorkspace:!1,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0};function Mn(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pn(e){let n=Mn(e)?e:{},t={};for(let[r,l]of Object.entries(ye))t[r]=typeof n[r]=="boolean"?n[r]:l;return t}function Mt(){try{let e=window.localStorage?.getItem(Ft);return e==null?{...ye}:Pn(JSON.parse(e))}catch{return{...ye}}}function Pt(e){try{window.localStorage?.setItem(Ft,JSON.stringify(e))}catch{}}var C=U(A("react"),1);function ee({label:e,hint:n,checked:t,onChange:r,warn:l}){return C.default.createElement("div",{className:"nxe-settings-row"},C.default.createElement("div",null,C.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:C.default.createElement("div",{className:"nxe-settings-hint"},n),l===!0?C.default.createElement("p",{className:"nxe-warn"},n):null),C.default.createElement("button",{type:"button",className:"nxe-switch",role:"switch","aria-checked":t,"aria-label":e,"data-on":String(t),onClick:()=>r(!t)}))}function Gt({copy:e,prefs:n,setPref:t}){let r=n.openPreviewOnClick===!1&&n.openPreviewOnDoubleClick===!1;return C.default.createElement("div",{className:"nxe-settings","data-nxe-settings":"true"},C.default.createElement("p",{className:"nxe-settings-hint"},e.settingsDescription),C.default.createElement(ee,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:n.openPreviewOnClick,onChange:l=>t("openPreviewOnClick",l)}),C.default.createElement(ee,{label:e.settingsOpenOnDoubleClick,checked:n.openPreviewOnDoubleClick,onChange:l=>t("openPreviewOnDoubleClick",l)}),r?C.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,C.default.createElement(ee,{label:e.settingsShowOpenButton,checked:n.showOpenButton,onChange:l=>t("showOpenButton",l)}),C.default.createElement(ee,{label:e.settingsFollowSymlinks,checked:n.followSymlinks,onChange:l=>t("followSymlinks",l)}),C.default.createElement(ee,{label:e.settingsAllowOutside,hint:e.settingsAllowOutsideHint,checked:n.allowOutsideWorkspace,onChange:l=>t("allowOutsideWorkspace",l)}),C.default.createElement(ee,{label:e.settingsShowIgnoredBadge,checked:n.showIgnoredBadge,onChange:l=>t("showIgnoredBadge",l)}),C.default.createElement(ee,{label:e.settingsShowGit,checked:n.showGitStatus,onChange:l=>t("showGitStatus",l)}),C.default.createElement(ee,{label:e.settingsShowStatusBar,checked:n.showStatusBar,onChange:l=>t("showStatusBar",l)}),C.default.createElement(ee,{label:e.settingsStatsExcludeGit,checked:n.statsExcludeGit,onChange:l=>t("statsExcludeGit",l)}))}var zt=`${et}

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
.nxe-status-right { font-variant-numeric: tabular-nums; }
.nxe-branch, .nxe-commit, .nxe-sync, .nxe-ab, .nxe-status-stat {
  display: inline-flex; align-items: center; gap: 6px;
  box-sizing: border-box; padding: 1px 8px;
  border: none; border-radius: var(--dsw-radius-sm);
  background: transparent; color: inherit;
  font: inherit; font-variant-numeric: tabular-nums; line-height: inherit; white-space: nowrap;
}
.nxe-branch svg, .nxe-sync svg { width: 14px; height: 14px; flex: none; }
.nxe-sync-counts { font-variant-numeric: tabular-nums; letter-spacing: .01em; }
.nxe-sync[data-behind="0"][data-ahead="0"] { color: var(--dsw-alias-label-tertiary); }
/* The no-upstream stand-in is a label, not a control. */
.nxe-sync[data-nxe-sync="none"] { color: var(--dsw-alias-label-tertiary); cursor: default; }
.nxe-branch { min-width: 0; }
.nxe-branch-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.nxe-branch[data-detached="true"] { color: var(--dsw-alias-label-tertiary); }
.nxe-ab { color: var(--dsw-alias-label-tertiary); }
button.nxe-commit, button.nxe-sync { cursor: pointer; }
@media (hover: hover) {
  button.nxe-commit:hover:not(:disabled), button.nxe-sync:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
}
.nxe-commit:disabled { opacity: .55; cursor: default; }
.nxe-commit:focus-visible, .nxe-sync:focus-visible, .nxe-branch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }
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
`;var jt=U(A("@deepseek-ai/dsh-client-ui-primitives"),1),{createElement:te,useCallback:Gn,useEffect:zn,useState:Un}=ot.default,Wn=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"],Ut="nanoExplorerExtra",jn="files",Pe="nano-explorer-extra",Wt={handler:void 0};function Hn(){let e=Mt(),n=new Set;return{get:()=>e,set:t=>{e=t,Pt(e);for(let r of n)r()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function _n(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=zt,document.head.append(n),e.effect(()=>()=>n.remove());let t=Hn(),r=c=>e.sessions.list.getSnapshot().byId[c]?.cwd,l=c=>{Wt.handler?.(c)},m=()=>e.locale.getSnapshot().active,g=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",h=()=>({copy:oe(m()),prefs:t.get(),scheme:g,statusLabel:Lt,onListed:()=>{},setRenameHandler:c=>{Wt.handler=c}});e.effect(()=>e.sidebarRightTabs.register({id:Pe,kind:jn,priority:"extension",title:()=>oe(m()).typeLabel,guide:[{id:"explorer",order:10,title:()=>oe(m()).typeLabel,description:()=>oe(m()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:Pe,inject:()=>({nxe:h()})},At)),"nano-explorer-extra: files body"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab.title",()=>e.slots.register({name:"sidebar.right.pane.tab.title",key:Pe},function({useTabInfo:s}){let{tab:i}=s();return te(ot.default.Fragment,null,te(jt.FileTypeIcon,{kind:"folder",size:16,className:"nxe-title-icon"}),i.title)})),"nano-explorer-extra: files tab title");let x=e.get("contextMenus");if(x!=null)for(let c of["file","directory"])e.effect(()=>x.register({id:`nano-explorer-extra.${c}`,target:c,order:900,resolve:async s=>{let i=oe(m()),f=s.sessionId===void 0?void 0:r(s.sessionId),v=f===void 0?s.path:J(f,s.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:i.copyRelative,failureLabel:i.copyFailed,run:()=>Kn(v)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:i.rename,failureLabel:i.renameFailed,run:()=>l?.({path:s.path,kind:c==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${c} menu`);e.slots.inject("contextMenu.icon",()=>{let c=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},qn),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},Yn)];return()=>{for(let s of c)s()}}),e.effect(()=>e.locale.register(Ut,{zh:{title:be.zh.settingsTitle,description:be.zh.settingsDescription},en:{title:be.en.settingsTitle,description:be.en.settingsDescription}}),"nano-explorer-extra: dictionaries"),e.effect(()=>e.slots.inject("settings.section",()=>e.slots.register({name:"settings.section",id:Pe,order:40,locale:Ut,label:()=>oe(m()).settingsTitle},function(){let[s,i]=Un(()=>t.get());zn(()=>t.subscribe(()=>i(t.get())),[]);let f=Gn((v,M)=>t.set({...t.get(),[v]:M}),[]);return te(Gt,{copy:oe(m()),prefs:s,setPref:f})})),"nano-explorer-extra: settings section")}async function Kn(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function qn(){return te("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},te("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),te("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))}function Yn(){return te("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},te("path",{d:"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"}),te("path",{d:"M13.5 6.5 17.5 10.5"}))}return wn(Jn);})();
		return __nxeExport;
	}
});
