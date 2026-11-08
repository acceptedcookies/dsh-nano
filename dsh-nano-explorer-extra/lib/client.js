window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
var __nxeExport=(()=>{var Xt=Object.create;var $e=Object.defineProperty;var Zt=Object.getOwnPropertyDescriptor;var Qt=Object.getOwnPropertyNames;var en=Object.getPrototypeOf,tn=Object.prototype.hasOwnProperty;var K=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var nn=(e,n)=>{for(var t in n)$e(e,t,{get:n[t],enumerable:!0})},ot=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let l of Qt(n))!tn.call(e,l)&&l!==t&&$e(e,l,{get:()=>n[l],enumerable:!(r=Zt(n,l))||r.enumerable});return e};var V=(e,n,t)=>(t=e!=null?Xt(en(e)):{},ot(n||!e||!e.__esModule?$e(t,"default",{value:e,enumerable:!0}):t,e)),an=e=>ot($e({},"__esModule",{value:!0}),e);var An={};nn(An,{DEFAULT_PREFS:()=>xe,apply:()=>Bn,inject:()=>Rn});var Bt=V(K("react"),1);var p=V(K("react"),1);var C=V(K("react"),1),ee=K("@deepseek-ai/dsh-client-ui-primitives"),{useState:it}=C.default;function ve({copy:e,title:n,children:t,confirmDisabled:r,busy:l,error:m,onConfirm:f,onCancel:h,confirmLabel:x}){return C.default.createElement(ee.Modal,{open:!0,onClose:h,title:n,closeLabel:e.cancel,footer:C.default.createElement(C.default.Fragment,null,C.default.createElement(ee.Button,{variant:"outline",className:"nxe-modal-action",onClick:h},e.cancel),C.default.createElement(ee.Button,{variant:"primary",className:"nxe-modal-action",disabled:r===!0||l===!0,onClick:f},x??e.confirm))},t,m===void 0?null:C.default.createElement("p",{className:"nxe-dialog-error",role:"alert"},m))}function st({children:e}){return C.default.createElement("div",{className:"nxe-dialog-field"},e)}function lt({copy:e,files:n,busy:t,error:r,onConfirm:l,onCancel:m}){let[f,h]=it(""),x=f.trim()==="";return C.default.createElement(ve,{copy:e,title:e.commitTitle,confirmLabel:e.commit,confirmDisabled:x,busy:t,error:r,onConfirm:()=>l(f),onCancel:m},C.default.createElement(st,null,C.default.createElement("p",null,e.commitBody(n.length)),C.default.createElement("ul",{className:"nxe-dialog-changed"},n.slice(0,40).map(u=>C.default.createElement("li",{key:u.path,title:u.path},`${u.status} ${u.path}`))),C.default.createElement(ee.Input,{value:f,placeholder:e.commitPlaceholder,"data-modal-autofocus":!0,onChange:u=>h(u.currentTarget.value)})))}function _e({copy:e,currentName:n,busy:t,error:r,onConfirm:l,onCancel:m,mode:f="rename"}){let[h,x]=it(n),u=h.trim()==="",s=f==="create";return C.default.createElement(ve,{copy:e,title:s?e.newEntryTitle:e.renameTitle,confirmLabel:s?e.create:e.confirm,busy:t,error:r,confirmDisabled:u,onConfirm:()=>l(h),onCancel:m},C.default.createElement(st,null,C.default.createElement("p",null,s?e.newEntryBody(n):e.renameBody(n)),C.default.createElement(ee.Input,{value:h,"data-modal-autofocus":!0,spellCheck:!1,autoComplete:"off",onChange:i=>x(i.currentTarget.value),onKeyDown:i=>{i.key==="Enter"&&!u&&(i.preventDefault(),l(h))}})))}var M=V(K("react"),1);function dt(e){return function({entry:t}){let r=e.copy(),l=e.statusOf(t.path),m=e.ignoredOf(t.path),f=e.linkOf(t.path),h=t.meta?.kind!=="directory",x=h?void 0:e.folderStatusOf(t.path),u=e.showGit()&&!m;return M.default.createElement("span",{className:"nxe-acc",...m?{"data-nxe-ignored":"true"}:{}},f===void 0?null:M.default.createElement("span",{className:"nxe-acc-link",title:f?r.symlinkOutside:r.symlinkBadge,"aria-label":f?r.symlinkOutside:r.symlinkBadge,"data-nxe-symlink":f?"outside":"inside"},M.default.createElement("svg",{viewBox:"0 0 24 24",width:11,height:11,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round","aria-hidden":"true"},M.default.createElement("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),M.default.createElement("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))),u&&l!==void 0?M.default.createElement("span",{className:"nxe-acc-letter","data-status":l,title:e.statusLabel(l),"aria-label":e.statusLabel(l)},l):null,u&&x!==void 0?M.default.createElement("span",{className:"nxe-acc-dot","data-status":x,title:e.statusLabel(x),"aria-label":e.statusLabel(x)}):null,m&&e.showIgnoredBadge()?M.default.createElement("span",{className:"nxe-acc-ignored",title:r.ignoredBadge},r.ignoredBadge):null,h&&e.showOpenButton()?M.default.createElement("button",{type:"button",className:"nxe-open nxe-tool",tabIndex:-1,title:r.openFile,"aria-label":`${r.openFile} ${t.name}`,"data-nxe-open":t.path,onClick:s=>{s.stopPropagation(),e.open(t)}},M.default.createElement("svg",{viewBox:"0 0 24 24",width:12,height:12,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},M.default.createElement("path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}),M.default.createElement("path",{d:"M15 3h6v6"}),M.default.createElement("path",{d:"M10 14 21 3"}))):null)}}var R=V(K("react"),1);function Ye(e){if(typeof e!="number"||!Number.isFinite(e)||e<=0)return"0 B";let n=["B","KiB","MiB","GiB","TiB"],t=e,r=0;for(;t>=1024&&r<n.length-1;)t/=1024,r+=1;return`${r===0?String(Math.round(t)):t.toFixed(1).replace(/\.0$/u,"")} ${n[r]}`}function ct(e,n){let t=Number.isFinite(e)&&e>0?e:0;return`${Number.isFinite(n)&&n>0?n:0}\u2193 ${t}\u2191`}var ke=K("@deepseek-ai/dsh-client-ui-primitives");function ut(e){let{copy:n,git:t,stats:r,statsState:l,prefs:m,onCommit:f,onRefreshGit:h,onRetryStats:x}=e;if(!m.showStatusBar)return null;let u=[];if(t==null)u.push(R.default.createElement("span",{key:"norepo",className:"nxe-branch","data-nxe-git":"none"},R.default.createElement(ke.IconBranchOutlineRegular,{width:14,height:14,opacity:.5}),R.default.createElement("span",{className:"nxe-branch-name"},n.notRepo)));else{let i=t.detached?n.detached:t.branch??n.detached;u.push(R.default.createElement("span",{key:"branch",className:"nxe-branch","data-nxe-git":"ready","data-detached":String(t.detached===!0),title:t.detached?n.branchTooltipDetached:t.upstream===null?i:n.branchTooltip(i,t.upstream)},R.default.createElement(ke.IconBranchOutlineRegular,{width:14,height:14}),R.default.createElement("span",{className:"nxe-branch-name","data-nxe-branch":t.branch??""},i)));let y=(t.files?.length??0)>0,O=y?n.commitTooltip:n.commitTooltipNone;t.upstream!==null&&t.upstream!==void 0?u.push(R.default.createElement("button",{key:"sync",type:"button",className:"nxe-sync","data-nxe-sync":"true","data-ahead":String(t.ahead??0),"data-behind":String(t.behind??0),title:n.syncTooltip(t.ahead??0,t.behind??0,t.upstream),"aria-label":n.syncTooltip(t.ahead??0,t.behind??0,t.upstream),onClick:h},R.default.createElement(ke.IconRefreshOutlineRegular,{width:14,height:14}),R.default.createElement("span",{className:"nxe-sync-counts"},ct(t.ahead??0,t.behind??0)))):u.push(R.default.createElement("span",{key:"nosync",className:"nxe-sync","data-nxe-sync":"none",title:n.noUpstream,"aria-label":n.noUpstream},n.noUpstream)),u.push(R.default.createElement("button",{key:"commit",type:"button",className:"nxe-commit",disabled:!y,title:O,"data-nxe-commit":"true",onClick:f},n.commit))}let s=[];if(l==="loading")s.push(R.default.createElement("span",{key:"loading"},n.statsLoading));else if(l==="failed")s.push(R.default.createElement("button",{key:"retry",type:"button",className:"nxe-retry",onClick:x},n.statsFailed));else if(r!=null){let i=`${n.statsTooltip(r.files,r.directories,Ye(r.bytes))}${r.truncated?` \xB7 ${n.truncated}`:""}${m.statsExcludeGit?` \xB7 ${n.statsExcludeGit}`:""}`;s.push(R.default.createElement("span",{key:"files",title:i,"data-nxe-stats":"true"},`${r.files}${r.truncated?"+":""} \xB7 ${r.directories} \xB7 ${Ye(r.bytes)}`))}return R.default.createElement("footer",{className:"nxe-status","data-nxe-status":"true"},R.default.createElement("div",{className:"nxe-status-left"},u),R.default.createElement("div",{className:"nxe-status-right"},s))}var he=V(K("react"),1),{useCallback:Wn,useEffect:pt,useRef:mt,useState:rn}=he.default;function ht({menu:e,copy:n,actions:t,onClose:r}){let l=mt(null),[m,f]=rn(0),h=e===null?[]:t,x=h.length,u=mt(h);u.current=h;let s=e===null?null:e.openedAt;if(pt(()=>{s!==null&&f(0)},[s]),pt(()=>{if(e===null)return;let F=I=>{l.current!==null&&!l.current.contains(I.target)&&r()},z=I=>{if(I.key==="Escape"){I.stopPropagation(),r();return}if(I.key==="ArrowDown"){I.preventDefault(),f(L=>(L+1)%x);return}if(I.key==="ArrowUp"){I.preventDefault(),f(L=>(L-1+x)%x);return}if(I.key==="Enter"){I.preventDefault();let L=u.current[m];r(),L?.run()}};return document.addEventListener("pointerdown",F,!0),document.addEventListener("keydown",z,!0),()=>{document.removeEventListener("pointerdown",F,!0),document.removeEventListener("keydown",z,!0)}},[e,m,x,r]),e===null||x===0)return null;let i=208,y=x*28+8,O=Math.min(e.x,(window.innerWidth||i)-i-8),Q=Math.min(e.y,(window.innerHeight||y)-y-8);return he.default.createElement("div",{className:"nxe-menu",role:"menu",ref:l,style:{position:"fixed",left:`${Math.max(8,O)}px`,top:`${Math.max(8,Q)}px`,minWidth:`${i}px`},"data-nxe-menu":"true"},h.map((F,z)=>he.default.createElement("button",{key:F.id,type:"button",role:"menuitem",className:"nxe-menu-item","data-active":String(z===m),"data-tone":F.tone??"default",onMouseEnter:()=>f(z),onClick:()=>{r(),F.run()}},F.icon===void 0?null:he.default.createElement("span",{className:"nxe-menu-icon","aria-hidden":"true"},F.icon),he.default.createElement("span",{className:"nxe-menu-label"},F.label))))}var D=V(K("@deepseek-ai/dsh-client-ui-primitives"),1);var wt=V(K("react"),1);function re(e,n){let t=X(e),r=String(n??"").replace(/\\/gu,"/");return r===""?t:r.startsWith("/")||/^[A-Za-z]:\//u.test(r)?X(r):`${t==="/"?"":t}/${r}`.replace(/\/{2,}/gu,"/")}function G(e,n){return X(re(e,n))}function on(e,n){let t=X(e),r=X(n);return t===r?!0:r.startsWith(t==="/"?"/":`${t}/`)}function Y(e,n){let t=X(e),r=X(n);return r===t?"":on(t,r)?r.slice(t==="/"?1:t.length+1):r}function Be(e){let n=X(e),t=n.lastIndexOf("/");return t<=0?"/":n.slice(0,t)}function Ee(e){let n=X(e),t=n.lastIndexOf("/");return t===-1?n:n.slice(t+1)}function X(e){let n=String(e??"").replace(/\\/gu,"/"),t=n.replace(/\/+$/u,"");return t===""?n.startsWith("/")?"/":"":t}var{useCallback:oe,useEffect:ft,useMemo:gt,useRef:xt,useState:Se}=wt.default;function bt(e){let{sessionId:n,root:t,request:r,prefs:l,onListed:m}=e,[f,h]=Se(()=>new Map),[x,u]=Se(()=>new Set),[s,i]=Se(null),[y,O]=Se(null),[Q,F]=Se(0),z=xt(!0),I=xt(m);I.current=m,ft(()=>()=>{z.current=!1},[]);let L=oe(async(b,k=!1,v=void 0)=>{let E=G(t,b);k||h(_=>{let H=new Map(_);return H.get(E)===void 0&&H.set(E,{loading:!0,entries:[]}),H});let g=await r("/list",{sessionId:n,path:b,followSymlinks:l.followSymlinks,allowOutsideWorkspace:v===!0||l.allowOutsideWorkspace===!0||l.allowed?.includes(G(t,b))===!0});if(z.current)return h(_=>{let H=new Map(_),J=H.get(E);return g.ok?H.set(E,{entries:g.entries,truncated:g.truncated===!0,outside:g.outside===!0,failed:J?.failed===!0&&J.entries?.length>0?J.failed:!1}):H.set(E,{entries:J?.entries??[],failed:!0,message:g.message,code:g.code}),H}),I.current?.(b,g.ok?g.entries.map(_=>_.name):[]),g},[t,n,r,l.followSymlinks,l.allowOutsideWorkspace,l.allowed]);ft(()=>{t!==void 0&&(h(new Map),L(t))},[t,Q,L]);let Le=oe(async()=>{F(b=>b+1)},[]),we=oe(b=>L(b,!0),[L]),se=oe((b,k)=>{let v=G(t,b);u(E=>{let g=new Set(E);return k?g.add(v):g.delete(v),g}),k&&f.get(v)===void 0&&L(b)},[t,f,L]),j=oe(b=>{let k=G(t,b);h(v=>{if(v.has(k))return v;let E=new Map(v);return E.set(k,{entries:[]}),E})},[t]),le=oe(b=>{let k=G(t,b);h(v=>{if(!v.has(k))return v;let E=new Map(v);return E.delete(k),E})},[t]),q=oe(b=>{let k=G(t,b);u(v=>{let E=new Set;for(let g of v)g!==k&&!g.startsWith(`${k}/`)&&E.add(g);return E}),h(v=>{let E=new Map;for(let[g,_]of v)g!==k&&!g.startsWith(`${k}/`)&&E.set(g,_);return E})},[t]),Ce=gt(()=>{let b=[];for(let[k,v]of f)for(let E of v.entries??[]){let g=k===""?E.name:`${k}/${E.name}`;b.push({...E,path:g})}return b},[f]),P=gt(()=>{let b={};for(let[k,v]of f)v.loading===!0&&(v.entries?.length??0)===0?b[k]={loading:!0}:v.failed===!0?b[k]={failure:v.message}:v.truncated===!0&&(b[k]={truncated:!0});return b},[f]);return{levels:f,entries:Ce,directories:P,expanded:[...x],selected:s,setSelected:i,toggle:se,pending:y,setPending:O,refresh:Le,refreshLevel:we,loadLevel:L,forget:le,collapseUnder:q,knownEmpty:j}}var sn=".md";function yt(e,n){let t=e==="file"?"untitled":"new-folder",r=new Set((n??[]).map(m=>String(m.name??"").toLowerCase())),l=m=>e==="file"?`${t}${m===1?"":`-${m}`}${sn}`:`${t}${m===1?"":`-${m}`}`;for(let m=1;m<1e4;m+=1){let f=l(m);if(!r.has(f.toLowerCase()))return f}throw new Error("cannot find an unused name")}function vt(e,n){let t=String(e??"").trim();return t===""?{ok:!1,message:n.nameEmpty}:t==="."||t===".."?{ok:!1,message:n.invalidName}:/[/\\\0]/u.test(t)?{ok:!1,message:n.nameSlash}:{ok:!0,name:t}}var{useCallback:S,useEffect:Oe,useMemo:te,useRef:fe,useState:B}=p.default,ln=400,dn=["U","D","M","A","R","?"],cn=new Set([".git",".DS_Store"]);function kt(e){let{useTabInfo:n,sessionId:t,useSessions:r,renderSlot:l,renderFactorySlot:m,useContextMenu:f,nxe:h}=e,{tab:x,panel:u}=n(),s=r(a=>a.byId[t]?.cwd),i=h.copy,y=h.prefs,[O,Q]=B(null),[F,z]=B(void 0),[I,L]=B(null),[Le,we]=B("idle"),[se,j]=B(null),[le,q]=B(!1),[Ce,P]=B(void 0),b=fe(new Set),[k,v]=B(()=>new Set),[E,g]=B(void 0),[_,H]=B(void 0),[J,Dt]=B([]);Oe(()=>{let a=!0;return(async()=>{try{let o=await fetch("/open-in-app/apps",{credentials:"same-origin",cache:"no-store"});if(!o.ok)return;let d=await o.json(),w=Array.isArray(d.apps)?d.apps:[];a&&Dt(w.filter($=>typeof $=="string"))}catch{}})(),()=>{a=!1}},[]);let[be,Ae]=B(null),[U,Ve]=B(null),[Te,Fe]=B(null),Me=fe(0),[Ge,Pe]=B(null),[ze,It]=B(()=>new Map),Xe=fe({path:"",at:0}),de=fe(y);de.current=y;let N=S(async(a,o)=>{try{let d=await fetch(`/nano-explorer-extra${a}`,{method:o===void 0?"GET":"POST",headers:o===void 0?void 0:{"content-type":"application/json"},body:o===void 0?void 0:JSON.stringify(o),credentials:"same-origin",cache:"no-store"}),w=await d.json().catch(()=>({error:`HTTP ${d.status}`}));return d.ok?{ok:!0,...w}:{ok:!1,message:w?.error??`HTTP ${d.status}`}}catch(d){return{ok:!1,message:d instanceof Error?d.message:String(d)}}},[]),Lt=S(async(a,o)=>{if(!de.current.showGitStatus||!Array.isArray(o)||o.length===0)return;let d=await N("/ignored",{sessionId:t,paths:o});!d.ok||!Array.isArray(d.ignored)||d.ignored.length===0||Ft(w=>{let $=new Set(w),A=Y(s??"",a);for(let W of d.ignored)$.add(A===""?W:`${A}/${W}`);return $})},[N,t,s]),Ze=te(()=>[...k],[k]),At=te(()=>({...y,allowed:Ze}),[y,Ze]),c=bt({sessionId:t,root:s,request:N,prefs:At,onListed:(a,o)=>{Lt(a,o)}}),ce=S(async()=>{if(s===void 0)return;if(!de.current.showGitStatus){Q(null),z(void 0);return}let a=await N(`/status?sessionId=${encodeURIComponent(t)}`);if(!a.ok){z(a.message);return}Q(a.git??null),z(a.gitError)},[s,t,N]),ae=S(async()=>{if(s===void 0)return;we("loading");let a=await N(`/status?sessionId=${encodeURIComponent(t)}&only=stats`);if(!a.ok){we("failed");return}L(a.stats??null),we("ok")},[s,t,N]);Oe(()=>{ce()},[ce]),Oe(()=>{ae()},[s]);let Ue=fe(0),ue=S(()=>{window.clearTimeout(Ue.current),Ue.current=window.setTimeout(()=>{ae()},2e3)},[ae]);Oe(()=>()=>{window.clearTimeout(Ue.current),window.clearTimeout(Me.current)},[]);let We=te(()=>Array.isArray(O?.files)?O.files:[],[O]),je=te(()=>{let a=new Map;for(let o of We)a.set(o.path,o.status);return a},[We]),[He,Ft]=B(()=>new Set),pe=O?.root,Qe=fe(pe);Qe.current=pe;let Re=te(()=>{if(ze.size===0)return je;let a=new Map(je);for(let[o,d]of ze)a.set(o,d);return a},[je,ze]),me=S(a=>{if(pe==null)return;let o=re(s??"",a);return Y(pe,o)},[pe,s]),Ke=S(a=>{let o=me(a);if(o===void 0)return!1;if(He.has(o))return!0;let d=o.split("/");for(let w=d.length-1;w>0;w-=1)if(He.has(d.slice(0,w).join("/")))return!0;return!1},[He,me]),et=S(a=>{let o=me(a);if(o!==void 0)return Re.get(o)},[Re,me]),ye=S(a=>{let o=re(s??"",a.path),d=`dsh-resource://file/session/${encodeURIComponent(t)}/${o.replace(/^\/+/,"").split("/").map(encodeURIComponent).join("/")}`;u.isFloating?x.actions.openResource(d):x.actions.openResource(d,{paneId:u.id})},[s,t,x.actions,u.id,u.isFloating]),tt=S(async a=>{if(s===void 0||!de.current.showGitStatus)return;let o=await N(`/status?sessionId=${encodeURIComponent(t)}&path=${encodeURIComponent(a)}`);if(!o.ok||o.git===null||o.git===void 0)return;let d=o.git.root;It(w=>{let $=new Map(w);for(let A of o.git.files??[]){let W=d===void 0?A.path:`${d.replace(/\/+$/u,"")}/${A.path}`,Ne=Qe.current??s,rt=Y(Ne,W);rt!==W&&$.set(rt,A.status)}return $})},[s,t,N]),Mt=S(async a=>{let o=await c.loadLevel(a.path);if(o?.ok){c.toggle(a.path,!0),tt(a.path);return}if(o?.code!=="outside-workspace"){c.toggle(a.path,!0);return}Pe({path:a.path,name:a.name})},[c,tt]),Gt=S(async a=>{q(!0);let o=await N("/delete",{sessionId:t,path:a.path,kind:a.kind==="directory"?"directory":"file"});if(q(!1),!o.ok){g(o.message);return}Fe(null),g(void 0),c.forget(a.path),c.collapseUnder(a.path);let d=Be(a.path);d!==a.path&&await c.refreshLevel(d),c.selected===a.path&&c.setSelected(null),ue()},[t,N,c,ue]),nt=S(a=>{if(s===void 0)return;let o=un(c,s),d=pn(c,s,o);g(void 0),Ae({kind:a,directory:o,proposed:yt(a,d)})},[s,c]),Pt=S(async a=>{if(be===null)return;let{kind:o,directory:d}=be,w=vt(a,i);if(!w.ok){g(w.message);return}q(!0);let $=await N(o==="file"?"/create-file":"/create-folder",{sessionId:t,directory:d,name:w.name});if(q(!1),!$.ok){g($.message);return}Ae(null),g(void 0),await c.refreshLevel(d);let A=Y(s??"",d),W=re(s??"",`${A===""?"":`${A}/`}${w.name}`);c.setSelected(W),o==="folder"&&(c.knownEmpty(W),c.toggle(W,!0)),ue()},[be,i,s,t,N,c,ue]),zt=S(async(a,o)=>{if(s===void 0)return;let d=re(s,a.path),w=a.meta?.kind==="directory"?"directory":"file";q(!0),P(void 0);let $=await N("/rename",{sessionId:t,path:d,name:o,kind:w});if(q(!1),!$.ok){P($.message);return}j(null);let A=Be(d);await c.refreshLevel(A),w==="directory"&&c.collapseUnder(d),c.setSelected(re(s,`${Y(s,A)===""?"":`${Y(s,A)}/`}${o.trim()}`)),ue()},[s,t,N,c,ue]),Ut=S(async a=>{q(!0),P(void 0);let o=await N("/commit",{sessionId:t,message:a});if(q(!1),!o.ok){P(o.message);return}j(null),await c.refresh(),await ce(),await ae()},[t,N,c,ce,ae]),qe=S(async(a,o)=>{try{await navigator.clipboard.writeText(o||a),H(i.copied),window.clearTimeout(Me.current),Me.current=window.setTimeout(()=>H(void 0),1600)}catch(d){g(d instanceof Error?d.message:String(d))}},[i.copied]),Wt=S((a,o)=>({onContextMenu:d=>{d.preventDefault(),d.stopPropagation(),c.setSelected(a.path),Ve({x:d.clientX,y:d.clientY,path:a.path,name:a.name,kind:o,openedAt:Date.now()})}}),[c]),jt=S(a=>{let o=me(a);if(o===void 0)return;let d=o===""?"":`${o}/`,w,$=-1;for(let[A,W]of Re){if(d!==""&&!A.startsWith(d))continue;let Ne=dn.indexOf(W);Ne>$&&($=Ne,w=W)}return w},[Re,me]),at=te(()=>dt({copy:()=>i,statusOf:et,ignoredOf:Ke,folderStatusOf:jt,linkOf:a=>c.levels.get(G(s??"",a))?.outside===!0?!0:void 0,showGit:()=>y.showGitStatus,showIgnoredBadge:()=>y.showIgnoredBadge,showOpenButton:()=>y.showOpenButton,statusLabel:a=>h.statusLabel(i,a),open:a=>ye(a)}),[i,et,Ke,c.levels,s,y.showGitStatus,y.showIgnoredBadge,y.showOpenButton,h,ye]),Ht=te(()=>({slots:{accessory:at},fallback:null}),[at]);if(s===void 0)return p.default.createElement("div",{className:"nxe-row-note","data-nxe":"true"},i.noWorkspace);let Kt=c.entries.filter(a=>!cn.has(a.name)).map(a=>({path:a.path,name:a.name,meta:{kind:a.type==="directory"?"directory":a.type==="file"?"file":"other",...a.symlink===!0?{link:!0}:{},...a.outside===!0?{outside:!0}:{},...Ke(a.path)?{hidden:!0}:{}}})),qt=m("sidebar.files.tree",{root:G(s,s),entries:Kt,expanded:c.expanded,directories:c.directories,current:c.selected===null?void 0:G(s,c.selected),onToggle:a=>{if(c.expanded.includes(a.path)){c.toggle(a.path,!1);return}if(k.has(a.path)){c.toggle(a.path,!0);return}Mt(a)},onOpen:a=>{c.setSelected(a.path);let o=Date.now(),d=Xe.current,w=d.path===a.path&&o-d.at<=ln;Xe.current={path:a.path,at:o},(w?de.current.openPreviewOnDoubleClick:de.current.openPreviewOnClick)&&ye(a)},rowTriggerProps:Wt,canOpen:()=>!0},Ht);Oe(()=>{let a=o=>{P(void 0),j({kind:"rename",entry:{path:o.path,name:Ee(o.path),meta:{kind:o.kind}}})};return h.setRenameHandler(a),()=>h.setRenameHandler(void 0)},[h]);let _t=S(a=>{if(c.pending!==null)return;if(a.key==="F2"&&c.selected!==null){a.preventDefault(),P(void 0),j({kind:"rename",entry:{path:c.selected,name:Ee(c.selected),meta:{kind:c.levels.has(c.selected)?"directory":"file"}}});return}let o=c.selected;if(o===null)return;let d=G(s??"",o),w=c.levels.has(d)||c.expanded.includes(d);if(a.key===" "){if(!w)return;a.preventDefault(),c.toggle(o,!c.expanded.includes(d));return}if(a.key==="Enter"){if(a.preventDefault(),w){c.toggle(o,!c.expanded.includes(d));return}ye({path:d,name:Ee(o),meta:{kind:"file"}})}},[c,s,ye]),Yt=Ge===null?null:p.default.createElement(ve,{copy:i,title:i.symlinkOutside,confirmLabel:i.openAnyway,onConfirm:()=>{let a=Ge.path;b.current=new Set(b.current).add(a),v(new Set(b.current)),Pe(null),c.loadLevel(a,!1,!0).then(()=>c.toggle(a,!0))},onCancel:()=>Pe(null)},p.default.createElement("p",null,i.symlinkOutsideBody(Ge.name))),Jt=se===null?null:se.kind==="commit"?p.default.createElement(lt,{copy:i,files:We,busy:le,error:Ce,onConfirm:Ut,onCancel:()=>{j(null),P(void 0)}}):p.default.createElement(_e,{copy:i,currentName:se.entry.name,busy:le,error:Ce,onConfirm:a=>zt(se.entry,a),onCancel:()=>{j(null),P(void 0)}}),Vt=te(()=>{if(U===null)return[];let a={path:U.path,name:U.name,kind:U.kind},o=J[0],d=w=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:w,path:U.path}),credentials:"same-origin"})};return[o===void 0?null:{id:"reveal",label:i.revealIn(Ie[o]??o),icon:p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(o)}`,alt:"",width:14,height:14}),run:()=>{d(o)}},{id:"copy-path",label:i.copyAbsolute,icon:p.default.createElement(D.IconCopyOutlineRegular,{width:14,height:14}),run:()=>{qe(U.path,U.path)}},{id:"copy-relative",label:i.copyRelative,icon:p.default.createElement(D.IconLinkOutlineRegular,{width:14,height:14}),run:()=>{qe(U.path,Y(s??"",U.path))}},{id:"rename",label:i.rename,icon:p.default.createElement(D.IconEditOutlineRegular,{width:14,height:14}),run:()=>{P(void 0),j({kind:"rename",entry:{...a,meta:{kind:U.kind}}})}},{id:"delete",label:i.delete,tone:"danger",icon:p.default.createElement(D.IconTrashOutlineRegular,{width:14,height:14}),run:()=>{g(void 0),Fe(a)}}].filter(Boolean)},[U,i,J,s,qe]);return p.default.createElement("div",{className:"nxe-root","data-nxe":"true","data-theme":h.scheme()},p.default.createElement("div",{className:"nxe-header"},p.default.createElement("span",{className:"nxe-path",title:s,"data-nxe-path":"true"},s),p.default.createElement(De,{label:i.newFile,onClick:()=>{nt("file")}},xn()),p.default.createElement(De,{label:i.newFolder,onClick:()=>{nt("folder")}},wn()),p.default.createElement(De,{label:i.rename,disabled:c.selected===null,onClick:()=>{let a=c.selected;a!==null&&(P(void 0),j({kind:"rename",entry:{path:a,name:Ee(a),meta:{kind:c.levels.has(a)?"directory":"file"}}}))}},yn()),p.default.createElement(vn,{copy:i,cwd:s??"",apps:J}),p.default.createElement(De,{label:i.reload,onClick:()=>{c.refresh(),ce(),ae()}},bn())),E===void 0?null:p.default.createElement("p",{className:"nxe-row-note",role:"status"},E),F===void 0?null:p.default.createElement("p",{className:"nxe-row-note nxe-note-error"},F),Te===null?null:p.default.createElement(ve,{copy:i,title:i.deleteTitle,busy:le,confirmLabel:i.delete,onConfirm:()=>{Gt(Te)},onCancel:()=>{Fe(null),g(void 0)}},p.default.createElement("p",null,i.deleteBody(Te.name)),Te.kind==="directory"?p.default.createElement("p",{className:"nxe-dialog-note"},i.deleteFolderNote):null),be===null?null:p.default.createElement(_e,{copy:i,mode:"create",busy:le,currentName:be.proposed,onConfirm:a=>{Pt(a)},onCancel:()=>{Ae(null),g(void 0)}}),p.default.createElement("div",{className:"nxe-tree","data-nxe-tree":"true",onKeyDown:_t},qt),_===void 0?null:p.default.createElement("div",{className:"nxe-toast",role:"status","aria-live":"polite","data-nxe-toast":"true"},_),p.default.createElement(ut,{copy:i,git:O,stats:I,statsState:Le,prefs:y,onCommit:()=>{P(void 0),j({kind:"commit"})},onRefreshGit:()=>{ce()},onRetryStats:()=>{ae()}}),Jt,Yt,p.default.createElement(ht,{menu:U,copy:i,actions:Vt,onClose:()=>Ve(null)}))}function De({label:e,onClick:n,children:t,disabled:r}){return p.default.createElement("button",{type:"button",className:"nxe-tool",title:e,"aria-label":e,onClick:n,disabled:r===!0},t)}function un(e,n){let t=e.selected;if(t===null)return n;let r=G(n,t);return e.levels.has(r)?r:Be(r)}function pn(e,n,t){return e.levels.get(G(n,t))?.entries??[]}var mn=D.IconPlusOutlineRegular,hn=D.IconFolderCloseRegular,fn=D.IconEditOutlineRegular,gn=D.IconRefreshOutlineRegular;function xn(){return p.default.createElement(mn,{width:16,height:16})}function wn(){return p.default.createElement(hn,{width:16,height:16})}function bn(){return p.default.createElement(gn,{width:16,height:16})}function yn(){return p.default.createElement(fn,{width:16,height:16})}function vn({copy:e,cwd:n,apps:t}){let r=Array.isArray(t)?t:[];if(n===""||r.length===0)return null;let[l,m]=p.default.useState(r[0]),[f,h]=p.default.useState(!1),x=p.default.useRef(null),u=r.includes(l)?l:r[0];p.default.useEffect(()=>{if(!f)return;let i=O=>{x.current!==null&&!x.current.contains(O.target)&&h(!1)},y=O=>{O.key==="Escape"&&h(!1)};return document.addEventListener("pointerdown",i,!0),document.addEventListener("keydown",y,!0),()=>{document.removeEventListener("pointerdown",i,!0),document.removeEventListener("keydown",y,!0)}},[f]);let s=i=>{fetch("/open-in-app/open",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app:i,path:n}),credentials:"same-origin"})};return p.default.createElement("span",{className:"nxe-reveal",ref:x,"data-nxe-reveal":u},p.default.createElement("button",{type:"button",className:"nxe-reveal-main",title:e.revealIn(Ie[u]??u),"aria-label":e.revealIn(Ie[u]??u),onClick:()=>{s(u)}},p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(u)}`,alt:"",width:14,height:14})),p.default.createElement("span",{className:"nxe-reveal-divider","aria-hidden":"true"}),p.default.createElement("button",{type:"button",className:"nxe-reveal-more",title:e.revealChoose,"aria-label":e.revealChoose,"aria-expanded":String(f),onClick:()=>h(i=>!i)},p.default.createElement("svg",{viewBox:"0 0 10 10",width:10,height:10,fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round","aria-hidden":"true"},p.default.createElement("path",{d:"M2.5 4L5 6.5 7.5 4"}))),f?p.default.createElement("div",{className:"nxe-menu",role:"menu",style:{position:"absolute",right:0,top:"26px"}},r.map(i=>p.default.createElement("button",{key:i,type:"button",role:"menuitem",className:"nxe-menu-item",onClick:()=>{m(i),h(!1),s(i)}},p.default.createElement("span",{className:"nxe-menu-icon","aria-hidden":"true"},p.default.createElement("img",{src:`/open-in-app/icon/${encodeURIComponent(i)}`,alt:"",width:14,height:14})),p.default.createElement("span",{className:"nxe-menu-label"},Ie[i]??i)))):null)}var Ie={finder:"Finder",explorer:"File Explorer",filemanager:"File Manager",dolphin:"Dolphin",nautilus:"Files",cursor:"Cursor",vscode:"VS Code",vscodeinsiders:"VS Code Insiders",windsurf:"Windsurf",zed:"Zed",sublimetext:"Sublime Text",xcode:"Xcode",androidstudio:"Android Studio",intellij:"IntelliJ IDEA",pycharm:"PyCharm",webstorm:"WebStorm",phpstorm:"PhpStorm",goland:"GoLand",rider:"Rider",rustrover:"RustRover",fork:"Fork",sourcetree:"Sourcetree",github:"GitHub Desktop",tower:"Tower",gitkraken:"GitKraken",smartgit:"SmartGit",sublimemerge:"Sublime Merge",ghostty:"Ghostty",warp:"Warp",iterm:"iTerm2",kitty:"kitty",terminal:"Terminal",windowsterminal:"Windows Terminal",gitbash:"Git Bash",gnometerminal:"GNOME Terminal",konsole:"Konsole"};var ge={zh:{typeLabel:"\u6587\u4EF6",typeDescription:"\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",newFile:"\u65B0\u5EFA\u6587\u4EF6",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",reload:"\u5237\u65B0",revealDirectory:"\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",revealIn:e=>`\u5728 ${e} \u4E2D\u663E\u793A`,revealChoose:"\u9009\u62E9\u6253\u5F00\u65B9\u5F0F",delete:"\u5220\u9664",deleteTitle:"\u5220\u9664",deleteBody:e=>`\u786E\u5B9A\u8981\u5220\u9664\u300C${e}\u300D\u5417\uFF1F`,deleteFolderNote:"\u6587\u4EF6\u5939\u53CA\u5176\u4E2D\u7684\u5168\u90E8\u5185\u5BB9\u90FD\u4F1A\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u64A4\u9500\u3002",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",truncated:"\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",noWorkspace:"\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",rename:"\u91CD\u547D\u540D",copyRelative:"\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",copyAbsolute:"\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",copyFailed:"\u590D\u5236\u5931\u8D25",renameFailed:"\u91CD\u547D\u540D\u5931\u8D25",copied:"\u5DF2\u590D\u5236",openFile:"\u6253\u5F00",renameTitle:"\u91CD\u547D\u540D",renameBody:e=>`\u628A\u300C${e}\u300D\u6539\u6210\uFF1A`,newEntryTitle:"\u65B0\u5EFA",newEntryBody:e=>`\u4F7F\u7528\u540D\u79F0\u300C${e}\u300D\uFF1A`,create:"\u521B\u5EFA",nameEmpty:"\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",nameSlash:"\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",nameTaken:"\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",invalidName:"\u540D\u5B57\u65E0\u6548",cancel:"\u53D6\u6D88",confirm:"\u786E\u5B9A",commit:"\u63D0\u4EA4",commitTooltip:"\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",commitTooltipNone:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",commitTooltipBusy:"\u6B63\u5728\u63D0\u4EA4\u2026",branchTooltip:(e,n)=>`\u5F53\u524D\u5206\u652F ${e}\uFF0C\u8DDF\u8E2A ${n}`,branchTooltipDetached:"\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",aheadBehindTooltip:(e,n)=>`\u5F85\u63A8\u9001 ${e} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${n} \u4E2A`,syncTooltip:(e,n,t)=>`\u4E0E ${t} \u540C\u6B65\uFF1A\u5F85\u62C9\u53D6 ${n} \u4E2A\uFF0C\u5F85\u63A8\u9001 ${e} \u4E2A`,noUpstream:"\u8FD9\u4E2A\u5206\u652F\u6CA1\u6709\u8BBE\u7F6E\u4E0A\u6E38",commitTitle:"\u63D0\u4EA4\u66F4\u6539",commitBody:e=>`\u5C06\u63D0\u4EA4 ${e} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,commitMessage:"\u63D0\u4EA4\u8BF4\u660E",commitPlaceholder:"\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",commitEmpty:"\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",none:"\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",notRepo:"\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",detached:"\u6E38\u79BB HEAD",gitOff:"Git \u72B6\u6001\u5DF2\u5173\u95ED",statsLoading:"\u7EDF\u8BA1\u4E2D\u2026",statsFailed:"\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",statsTooltip:(e,n,t)=>`${e} \u4E2A\u6587\u4EF6\uFF0C${n} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${t}`,statsExcludeGit:"\u4E0D\u542B .git",symlinkOutside:"\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF0C\u9ED8\u8BA4\u4E0D\u8DDF\u968F",openAnyway:"\u4ECD\u7136\u6253\u5F00",symlinkOutsideBody:e=>`\u300C${e}\u300D\u6307\u5411\u5DE5\u4F5C\u533A\u4EE5\u5916\u3002\u5217\u76EE\u5F55\u4F1A\u8BFB\u53D6\u90A3\u4E2A\u4F4D\u7F6E\u7684\u5185\u5BB9\uFF0C\u4F46\u4EFB\u4F55\u5199\u5165\u4ECD\u7136\u88AB\u9650\u5236\u5728\u5DE5\u4F5C\u533A\u5185\u3002`,symlinkBadge:"\u8F6F\u94FE\u63A5",ignoredBadge:"\u5DF2\u5FFD\u7565",folderRenameRefresh:"\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",settingsTitle:"\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",settingsDescription:"\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",settingsOpenOnClick:"\u5355\u51FB\u6253\u5F00\u9884\u89C8",settingsOpenOnClickHint:"\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",settingsOpenOnDoubleClick:"\u53CC\u51FB\u6253\u5F00\u9884\u89C8",settingsShowOpenButton:"\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",settingsFollowSymlinks:"\u8DDF\u968F\u5DE5\u4F5C\u533A\u5185\u7684\u8F6F\u94FE\u63A5",settingsAllowOutside:"\u5141\u8BB8\u8D8A\u8FC7\u5DE5\u4F5C\u533A\u8FB9\u754C\u5217\u76EE\u5F55",settingsAllowOutsideHint:"\u5F00\u542F\u540E\u53EF\u4EE5\u6D4F\u89C8\u6307\u5411\u5DE5\u4F5C\u533A\u5916\u7684\u76EE\u5F55\u3002\u5199\u5165\u4ECD\u7136\u88AB\u9650\u5236\u5728\u5DE5\u4F5C\u533A\u5185\u3002",settingsShowIgnoredBadge:"\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",settingsShowGit:"\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",settingsShowStatusBar:"\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",settingsStatsExcludeGit:"\u7EDF\u8BA1\u65F6\u6392\u9664 .git",settingsNoOpenPath:"\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",statusModified:"\u5DF2\u4FEE\u6539",statusAdded:"\u65B0\u589E",statusDeleted:"\u5DF2\u5220\u9664",statusRenamed:"\u91CD\u547D\u540D",statusConflicted:"\u51B2\u7A81",statusUntracked:"\u672A\u8DDF\u8E2A"},en:{typeLabel:"Files",typeDescription:"Browse the workspace with Git status and commits.",newFile:"New file",newFolder:"New folder",reload:"Reload",revealDirectory:"Reveal in file manager",revealIn:e=>`Reveal in ${e}`,revealChoose:"Choose an opener",delete:"Delete",deleteTitle:"Delete",deleteBody:e=>`Delete \u201C${e}\u201D?`,deleteFolderNote:"The folder and everything inside it will be removed. This cannot be undone.",loading:"Loading\u2026",empty:"This folder is empty",truncated:"Too many entries; only some are shown",noWorkspace:"This session has no working directory",rename:"Rename",copyRelative:"Copy relative path",copyAbsolute:"Copy absolute path",copyFailed:"Copy failed",renameFailed:"Rename failed",copied:"Copied",openFile:"Open",renameTitle:"Rename",renameBody:e=>`Rename \u201C${e}\u201D to:`,newEntryTitle:"New entry",newEntryBody:e=>`Create with the name \u201C${e}\u201D:`,create:"Create",nameEmpty:"The name cannot be empty",nameSlash:"The name cannot contain / or \\",nameTaken:"That name is already used here",invalidName:"Invalid name",cancel:"Cancel",confirm:"OK",commit:"Commit",commitTooltip:"Commit all changes",commitTooltipNone:"Nothing to commit",commitTooltipBusy:"Committing\u2026",branchTooltip:(e,n)=>`On ${e}, tracking ${n}`,branchTooltipDetached:"Detached HEAD",aheadBehindTooltip:(e,n)=>`${e} to push, ${n} to pull`,syncTooltip:(e,n,t)=>`Synced with ${t}: ${n} to pull, ${e} to push`,noUpstream:"This branch has no upstream",commitTitle:"Commit changes",commitBody:e=>`This commits changes in ${e} file(s).`,commitMessage:"Commit message",commitPlaceholder:"Describe this change\u2026",commitEmpty:"Enter a commit message",none:"Nothing to commit",notRepo:"Not a Git repository",detached:"Detached HEAD",gitOff:"Git status is off",statsLoading:"Counting\u2026",statsFailed:"Counting failed, click to retry",statsTooltip:(e,n,t)=>`${e} files, ${n} folders, ${t}`,statsExcludeGit:"excluding .git",symlinkOutside:"Points outside the workspace; not followed by default",openAnyway:"Open anyway",symlinkOutsideBody:e=>`\u201C${e}\u201D points outside the workspace. Listing reads that location, while every write stays confined to the workspace.`,symlinkBadge:"Symbolic link",ignoredBadge:"Ignored",folderRenameRefresh:"Folder renamed; child paths updated",settingsTitle:"Explorer Extra",settingsDescription:"These switches only affect how this browser shows the tree.",settingsOpenOnClick:"Open a preview on single click",settingsOpenOnClickHint:"When off, a single click only selects the row.",settingsOpenOnDoubleClick:"Open a preview on double click",settingsShowOpenButton:"Show an open button at the row end",settingsFollowSymlinks:"Follow symbolic links inside the workspace",settingsAllowOutside:"Allow listing outside the workspace",settingsAllowOutsideHint:"Lets you browse directories outside the workspace. Writes stay inside it.",settingsShowIgnoredBadge:"Show a badge on ignored entries",settingsShowGit:"Show Git status in the tree",settingsShowStatusBar:"Show the bottom status bar",settingsStatsExcludeGit:"Exclude .git from the totals",settingsNoOpenPath:"With both clicks off, use Enter or the row button to open a file.",statusModified:"Modified",statusAdded:"Added",statusDeleted:"Deleted",statusRenamed:"Renamed",statusConflicted:"Conflicted",statusUntracked:"Untracked"}};function kn(e){return typeof e=="string"&&e.toLowerCase().startsWith("zh")?"zh":"en"}function ne(e){return ge[kn(e)]}function Et(e,n){return{M:e.statusModified,A:e.statusAdded,D:e.statusDeleted,R:e.statusRenamed,U:e.statusConflicted,"?":e.statusUntracked}[n]??n}var St="dsh-nano-explorer-extra:prefs.v1",xe={openPreviewOnClick:!1,openPreviewOnDoubleClick:!0,showOpenButton:!0,followSymlinks:!0,allowOutsideWorkspace:!1,showIgnoredBadge:!1,showGitStatus:!0,showStatusBar:!0,statsExcludeGit:!0};function En(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Sn(e){let n=En(e)?e:{},t={};for(let[r,l]of Object.entries(xe))t[r]=typeof n[r]=="boolean"?n[r]:l;return t}function Ot(){try{let e=window.localStorage?.getItem(St);return e==null?{...xe}:Sn(JSON.parse(e))}catch{return{...xe}}}function Ct(e){try{window.localStorage?.setItem(St,JSON.stringify(e))}catch{}}var T=V(K("react"),1);function Z({label:e,hint:n,checked:t,onChange:r,warn:l}){return T.default.createElement("div",{className:"nxe-settings-row"},T.default.createElement("div",null,T.default.createElement("div",{className:"nxe-settings-label"},e),n===void 0?null:T.default.createElement("div",{className:"nxe-settings-hint"},n),l===!0?T.default.createElement("p",{className:"nxe-warn"},n):null),T.default.createElement("button",{type:"button",className:"nxe-switch",role:"switch","aria-checked":t,"aria-label":e,"data-on":String(t),onClick:()=>r(!t)}))}function Tt({copy:e,prefs:n,setPref:t}){let r=n.openPreviewOnClick===!1&&n.openPreviewOnDoubleClick===!1;return T.default.createElement("div",{className:"nxe-settings","data-nxe-settings":"true"},T.default.createElement("p",{className:"nxe-settings-hint"},e.settingsDescription),T.default.createElement(Z,{label:e.settingsOpenOnClick,hint:e.settingsOpenOnClickHint,checked:n.openPreviewOnClick,onChange:l=>t("openPreviewOnClick",l)}),T.default.createElement(Z,{label:e.settingsOpenOnDoubleClick,checked:n.openPreviewOnDoubleClick,onChange:l=>t("openPreviewOnDoubleClick",l)}),r?T.default.createElement("p",{className:"nxe-warn"},e.settingsNoOpenPath):null,T.default.createElement(Z,{label:e.settingsShowOpenButton,checked:n.showOpenButton,onChange:l=>t("showOpenButton",l)}),T.default.createElement(Z,{label:e.settingsFollowSymlinks,checked:n.followSymlinks,onChange:l=>t("followSymlinks",l)}),T.default.createElement(Z,{label:e.settingsAllowOutside,hint:e.settingsAllowOutsideHint,checked:n.allowOutsideWorkspace,onChange:l=>t("allowOutsideWorkspace",l)}),T.default.createElement(Z,{label:e.settingsShowIgnoredBadge,checked:n.showIgnoredBadge,onChange:l=>t("showIgnoredBadge",l)}),T.default.createElement(Z,{label:e.settingsShowGit,checked:n.showGitStatus,onChange:l=>t("showGitStatus",l)}),T.default.createElement(Z,{label:e.settingsShowStatusBar,checked:n.showStatusBar,onChange:l=>t("showStatusBar",l)}),T.default.createElement(Z,{label:e.settingsStatsExcludeGit,checked:n.statsExcludeGit,onChange:l=>t("statsExcludeGit",l)}))}var Rt=`
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
.nxe-dialog { width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 64px); overflow: auto; border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: var(--dsw-elevation-prominent); padding: 16px; }
.nxe-dialog h2 { margin: 0 0 8px; font-size: 14px; font-weight: 600; }
.nxe-dialog p { margin: 0 0 10px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog textarea, .nxe-dialog input { width: 100%; box-sizing: border-box; border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; padding: 6px 8px; }
.nxe-dialog textarea { min-height: 84px; resize: vertical; }
.nxe-dialog textarea:focus, .nxe-dialog input:focus { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 0; }
.nxe-dialog-error { margin: 8px 0 0; font-size: 12px; color: var(--dsw-alias-danger, #cf222e); }
.nxe-dialog-changed { margin: 6px 0 0; padding: 0; list-style: none; max-height: 120px; overflow: auto; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog-changed li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nxe-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
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
.nxe-dialog-note { margin: 8px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }

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
.nxe-dialog-field > p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 18px; }
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
`;var{createElement:ie,useCallback:On,useEffect:Cn,useState:Tn}=Bt.default,Rn=["slots","locale","sidebarRightTabs","sidebarRight","sessions","theme"],Nt="nanoExplorerExtra",Nn="files",Je="nano-explorer-extra",$t={handler:void 0};function $n(){let e=Ot(),n=new Set;return{get:()=>e,set:t=>{e=t,Ct(e);for(let r of n)r()},subscribe:t=>(n.add(t),()=>n.delete(t))}}function Bn(e){let n=document.createElement("style");n.dataset.nxeStyle="true",n.textContent=Rt,document.head.append(n),e.effect(()=>()=>n.remove());let t=$n(),r=u=>e.sessions.list.getSnapshot().byId[u]?.cwd,l=u=>{$t.handler?.(u)},m=()=>e.locale.getSnapshot().active,f=()=>e.theme.getTheme().colorScheme==="light"?"light":"dark",h=()=>({copy:ne(m()),prefs:t.get(),scheme:f,statusLabel:Et,onListed:()=>{},setRenameHandler:u=>{$t.handler=u}});e.effect(()=>e.sidebarRightTabs.register({id:Je,kind:Nn,priority:"extension",title:()=>ne(m()).typeLabel,guide:[{id:"explorer",order:10,title:()=>ne(m()).typeLabel,description:()=>ne(m()).typeDescription}]}),"nano-explorer-extra: files type"),e.effect(()=>e.slots.inject("sidebar.right.pane.tab",()=>e.slots.register({name:"sidebar.right.pane.tab",key:Je,inject:()=>({nxe:h()})},kt)),"nano-explorer-extra: files body");let x=e.get("contextMenus");if(x!=null)for(let u of["file","directory"])e.effect(()=>x.register({id:`nano-explorer-extra.${u}`,target:u,order:900,resolve:async s=>{let i=ne(m()),y=s.sessionId===void 0?void 0:r(s.sessionId),O=y===void 0?s.path:Y(y,s.path);return[{id:"copy-relative",icon:{key:"nano-explorer-extra.copy-relative"},label:i.copyRelative,failureLabel:i.copyFailed,run:()=>Dn(O)},{id:"rename",icon:{key:"nano-explorer-extra.rename"},label:i.rename,failureLabel:i.renameFailed,run:()=>l?.({path:s.path,kind:u==="directory"?"directory":"file"})}]}}),`nano-explorer-extra: ${u} menu`);e.slots.inject("contextMenu.icon",()=>{let u=[e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.copy-relative"},In),e.slots.register({name:"contextMenu.icon",key:"nano-explorer-extra.rename"},Ln)];return()=>{for(let s of u)s()}}),e.effect(()=>e.locale.register(Nt,{zh:{title:ge.zh.settingsTitle,description:ge.zh.settingsDescription},en:{title:ge.en.settingsTitle,description:ge.en.settingsDescription}}),"nano-explorer-extra: dictionaries"),e.effect(()=>e.slots.inject("settings.section",()=>e.slots.register({name:"settings.section",id:Je,order:40,locale:Nt,label:()=>ne(m()).settingsTitle},function(){let[s,i]=Tn(()=>t.get());Cn(()=>t.subscribe(()=>i(t.get())),[]);let y=On((O,Q)=>t.set({...t.get(),[O]:Q}),[]);return ie(Tt,{copy:ne(m()),prefs:s,setPref:y})})),"nano-explorer-extra: settings section")}async function Dn(e){try{await navigator.clipboard.writeText(String(e??""))}catch{}}function In(){return ie("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},ie("path",{d:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"}),ie("path",{d:"M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"}))}function Ln(){return ie("svg",{viewBox:"0 0 24 24",width:16,height:16,fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},ie("path",{d:"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"}),ie("path",{d:"M13.5 6.5 17.5 10.5"}))}return an(An);})();
		return __nxeExport;
	}
});
