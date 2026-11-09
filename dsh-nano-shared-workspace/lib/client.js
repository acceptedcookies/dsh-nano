window.__ModuleLoader__.load({
	id: "dsh-nano-shared-workspace",
	factory: (require) => {
var __nswExport=(()=>{var De=Object.create;var _=Object.defineProperty;var We=Object.getOwnPropertyDescriptor;var Fe=Object.getOwnPropertyNames;var $e=Object.getPrototypeOf,Ie=Object.prototype.hasOwnProperty;var T=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(r,t)=>(typeof require<"u"?require:r)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var Ae=(e,r)=>{for(var t in r)_(e,t,{get:r[t],enumerable:!0})},te=(e,r,t,n)=>{if(r&&typeof r=="object"||typeof r=="function")for(let s of Fe(r))!Ie.call(e,s)&&s!==t&&_(e,s,{get:()=>r[s],enumerable:!(n=We(r,s))||n.enumerable});return e};var F=(e,r,t)=>(t=e!=null?De($e(e)):{},te(r||!e||!e.__esModule?_(t,"default",{value:e,enumerable:!0}):t,e)),ze=e=>te(_({},"__esModule",{value:!0}),e);var Qe={};Ae(Qe,{apply:()=>Xe,inject:()=>Ve});var Tt=T("react");var A=F(T("react"),1),J=T("@deepseek-ai/dsh-client-ui-primitives");function D({copy:e,title:r,description:t,confirmLabel:n,confirmDisabled:s,busy:o,error:i,danger:y,footer:h,maxHeight:N,width:a,region:p,onConfirm:c,onCancel:f,children:b}){return A.default.createElement(J.Modal,{open:!0,onClose:f,title:r,description:t,closeLabel:e.cancel,className:["nano-dialog-card",N===void 0?"":"nano-dialog-capped",a===void 0?"":"nano-dialog-sized",p===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:h??A.default.createElement(A.default.Fragment,null,A.default.createElement(J.Button,{variant:"outline",className:"nano-modal-action",onClick:f},e.cancel),A.default.createElement(J.Button,{variant:y?"danger":"primary",className:"nano-modal-action",disabled:s===!0||o===!0,onClick:c},n??e.confirm))},b,i===void 0?null:A.default.createElement("p",{className:"nano-dialog-error",role:"alert"},i))}var z=F(T("react"),1),{useCallback:tt,useEffect:ne,useRef:re,useState:Le}=z.default;function oe({menu:e,actions:r,onClose:t,width:n=208}){let s=re(null),[o,i]=Le(0),y=e===null?[]:r,h=y.length,N=re(y);N.current=y;let a=e===null?null:e.openedAt;if(ne(()=>{a!==null&&i(0)},[a]),ne(()=>{if(e===null)return;let b=m=>{s.current!==null&&!s.current.contains(m.target)&&t()},k=m=>{if(m.key==="Escape"){m.stopPropagation(),t();return}if(m.key==="ArrowDown"){m.preventDefault(),i(C=>(C+1)%h);return}if(m.key==="ArrowUp"){m.preventDefault(),i(C=>(C-1+h)%h);return}m.key==="Enter"&&(m.preventDefault(),t(),N.current[o]?.run())};return document.addEventListener("pointerdown",b,!0),document.addEventListener("keydown",k,!0),()=>{document.removeEventListener("pointerdown",b,!0),document.removeEventListener("keydown",k,!0)}},[e,o,h,t]),e===null||h===0)return null;let p=h*28+8,c=Math.min(e.x,(window.innerWidth||n)-n-8),f=Math.min(e.y,(window.innerHeight||p)-p-8);return z.default.createElement("div",{className:"nano-menu",role:"menu",ref:s,style:{position:"fixed",left:`${Math.max(8,c)}px`,top:`${Math.max(8,f)}px`,minWidth:`${n}px`},"data-nano-menu":"true"},y.map((b,k)=>z.default.createElement(Pe,{key:b.id,item:b,index:k,active:k===o,onHover:i,onRun:t})))}function Pe({item:e,index:r,active:t,onHover:n,onRun:s}){return z.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>n(r),onClick:()=>{s(),e.run()}},e.icon===void 0?null:z.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),z.default.createElement("span",{className:"nano-menu-label"},e.label))}var se=F(T("react"),1),ae=T("react-dom/client");function V(e){let r=document.createElement("div");r.className="nano-menu-host",document.body.appendChild(r);let t=(0,ae.createRoot)(r),n=()=>{t.unmount(),r.remove()},s=e.anchor,o=s.left!==void 0?s.left:s.x,i=s.bottom!==void 0?s.bottom:(s.y??0)+(s.height??0);return t.render(se.default.createElement(oe,{menu:{x:o,y:i,openedAt:Date.now()},actions:e.items??[],width:e.width,onClose:n})),{close:n}}var j=F(T("react"),1),B=T("react-dom");var G=F(T("react"),1),E=T("@deepseek-ai/dsh-client-ui-primitives"),{createElement:d,useLayoutEffect:ie,useState:le}=G.default,qe=(e,r)=>Object.values(e?.members??{}).find(t=>t?.username===r)?.localPath??"",w=e=>e?.getAttribute?.("class")??"",q=e=>String(e).split(/\s+/).filter(Boolean),L=e=>q(e).filter(r=>!/_wide$/.test(r)).join(" "),P=(e,r)=>{let t=String(e).lastIndexOf("_");return t<0?"":e.slice(0,t+1)+r};function He(){let e=document.querySelector("[data-nano-shared-workspace]"),r=[...document.querySelectorAll("span")].find(l=>!e?.contains(l)&&l.children.length===0&&(l.textContent?.trim()==="\u5DE5\u4F5C\u533A"||l.textContent?.trim()==="Workspace")),t=r?.parentElement,n=t?.parentElement;if(t==null||n==null)return null;let s=[...n.children].find(l=>/listArea/.test(w(l))),o=s?.querySelector('[role="tree"]'),i=[...n.querySelectorAll('[class*="projectRow"]')].find(l=>!String(l.className).includes("menuOpen"));if(s==null||o==null||i==null)return null;let y=t.querySelector('[class*="searchSlot"]'),h=t.querySelector('[class*="headerActions"]'),N=y?.querySelector(":scope > div"),a=N?.querySelector("button")??y?.querySelector("button");if(y==null||h==null||a==null)return null;let p=i.querySelector('[class*="folder"]'),c=i.querySelector('[class*="chevron"]'),f=[...i.children].find(l=>/Text/.test(w(l))),b=f?.querySelector('[class*="title"]'),k=q(w(c?.querySelector("svg"))).find(l=>/arrow/.test(l)&&!/Open/.test(l))??"",m=q(w(i))[0]??"",C=[...n.querySelectorAll('[class*="sessionRow"]')].find(l=>!String(l.className).includes("selected")),I=L(q(w(C)).filter(l=>!/selected/.test(l)).join(" ")),g=[];for(let l of t.children){let R=getComputedStyle(l);if(R.display==="none"||R.position==="absolute"||R.position==="fixed"||w(l)===""&&l.getBoundingClientRect().width===0)continue;let u=l===r?"label":l===y?"search":l===h?"actions":"other";g.push({slot:u,cls:L(w(l))})}return{root:w(n),header:L(w(t)),template:g,search:w(N),searchButton:L(w(a)),actions:L(w(h)),button:L(w(h.querySelector("button"))),listArea:w(s),treeBody:o.parentElement===s?"":L(w(o.parentElement)),list:w(o),group:q(w(i.closest('[class*="groupSection"]'))).filter(l=>!/drop/.test(l)).join(" "),row:q(w(i)).filter(l=>!/menuOpen|drop/.test(l)).join(" "),folder:q(w(p)).filter(l=>!/Active/.test(l)).join(" "),chevron:w(c),projectText:w(f),title:w(b)||P(m,"title"),rowActions:w([...i.children].find(l=>/Actions/.test(w(l)))),arrow:k,arrowOpen:k?P(k,"arrowOpen"):"",sessionRow:I||P(m,"sessionRow"),sessionSlot:w(C?.querySelector('[class*="slot"]'))||P(m,"slot"),sessionTitle:w(C?.querySelector('[class*="title"]'))||P(m,"title"),resting:w(C?.querySelector('[class*="Resting"]'))||P(m,"rowResting"),time:w(C?.querySelector('[class*="time"]'))||P(m,"time")}}function Me(){let[e,r]=le(null);return ie(()=>{let t=0,n=0,s=()=>{let o=He();if(o){r(o);return}++t>40||(n=window.setTimeout(s,50))};return s(),()=>window.clearTimeout(n)},[]),e}var Y=(e,r,t,n)=>d("button",{type:"button",className:n,title:e,"aria-label":e,...t},r);function ce({face:e,wide:r}){let t=e.copy(),[n,s]=le(e.settings.current),o=Me();if(ie(()=>e.settings.subscribe(s),[]),!r)return d("div",{className:"nsw-rail",role:"complementary","aria-label":t.railTitle},d("button",{type:"button",className:"nsw-rail-button",title:t.railTitle,"aria-label":t.railTitle,onClick:e.onToggleRail},d(E.IconGlobeOutlineRegular,{size:16})));if(o==null)return null;let i=n?.configured===!0,y=n?.username,h=n?.viewFilter??"all",N=n?.expanded??{},a=n?.sessions??[],p=(n?.sharedWorkspaces??[]).filter(g=>h!=="mine"||Object.values(g?.members??{}).some(l=>l?.username===y)),c=g=>a.filter(l=>l.workspaceId===g),f=d("div",{className:o.actions},Y(t.viewOptions,d(E.IconSlidersTwoOutlineRegular,{size:16}),{"aria-haspopup":"menu","data-nsw-view-options":!0,onClick:e.onViewOptions},o.button),Y(t.addWorkspace,d(E.IconProjectAddOutlineRegular,{size:16}),{onClick:e.onCreateWorkspace},o.button)),b=o.template.map((g,l)=>{if(g.slot==="label")return d("span",{key:l,className:g.cls},t.title);if(g.slot==="search"){let R=Y(t.refresh,d(E.IconRefreshOutlineRegular,{size:14}),{onClick:e.onRefresh},o.searchButton);return d("div",{key:l,className:g.cls},o.search?d("div",{className:o.search},R):R)}return g.slot==="actions"?G.default.cloneElement(f,{key:l,className:g.cls}):d("div",{key:l,className:g.cls})}),k=p.map(g=>{let l=Object.values(g?.members??{}).some(S=>S?.username===y),R=c(g.workspaceId),u=N[g.workspaceId]===!0,W=u?R.map(S=>d("div",{role:"treeitem",key:S.sessionId,className:o.sessionRow,title:S.mtime??"",onClick:()=>e.onOpenSession?.(S)},d("span",{className:o.sessionSlot}),d("span",{className:o.sessionTitle},S.title||S.sessionId),d("span",{className:o.resting},d("span",{className:o.time},S.writerName??"")))):[];return d("div",{key:g.workspaceId,className:o.group},d("div",{role:"treeitem",className:o.row,"aria-expanded":u,title:l?`${t.stateJoined} \xB7 ${qe(g,y)}`:t.joinHint,onClick:()=>l?e.onToggleWorkspace?.(g.workspaceId):e.onJoinWorkspace?.(g.workspaceId)},d("span",{className:o.folder},d(u?E.IconFolderOpenRegular:E.IconFolderCloseRegular)),d("span",{className:o.chevron},d(E.IconTriangleRightFillRegular,{className:u?`${o.arrow} ${o.arrowOpen}`:o.arrow})),d("span",{className:o.projectText},d("span",{className:o.title},g?.title??g?.workspaceId)),l?null:d("span",{className:o.time},t.stateIdle),d("span",{className:o.rowActions})),W.length>0?d("div",{role:"group"},W):null)}),m=p.length===0?d("div",{className:o.group},d("div",{role:"button",className:o.row,onClick:i?e.onCreateWorkspace:e.onOpenSettings},d("span",{className:o.folder}),d("span",{className:o.chevron}),d("span",{className:o.projectText},d("span",{className:o.title},t.emptyHint)))):null,C=d("div",{className:o.list,role:"tree"},k,m),I=o.treeBody?d("div",{className:o.treeBody},C):C;return d("div",{className:`nsw-root ${o.root}`,role:"complementary","aria-label":t.title},d("div",{className:o.header},...b),d("div",{className:o.listArea},I))}var ke=F(T("react"),1);var U=T("@deepseek-ai/dsh-client-ui-primitives");var Be="/nano-shared-workspace";async function O(e,r){let t=await fetch(`${Be}${e}`,{credentials:"same-origin",cache:"no-store",...r}),n=await t.json().catch(()=>({}));if(!t.ok)throw new Error(typeof n?.error=="string"?n.error:`HTTP ${t.status}`);return n}var de=()=>O("/settings"),pe=()=>O("/status");function ue({username:e,token:r,accessKey:t}){return O("/settings/update",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({username:e,token:r,accessKey:t})})}var me=()=>O("/workspaces");function fe(e,r){return O("/workspaces/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:e,localPath:r})})}function ge(e,r){return O("/workspaces/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,localPath:r})})}var he=()=>O("/sync",{method:"POST"});function we(e,r){return O("/mkdir",{method:"POST",body:JSON.stringify({parent:e,name:r})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"mkdir failed");return t.path})}var ye=e=>O("/ls",{method:"POST",body:JSON.stringify(e===void 0?{}:{path:e})}),be=()=>O("/sessions");function xe(e,r){return O("/materialize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:r})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"materialize failed");return t})}var{createElement:x,useState:K}=ke.default;function X({label:e,children:r}){return x("label",{className:"nsw-field"},x("span",{className:"nsw-field-label"},e),r)}function ve({face:e,settings:r}){let t=e.copy(),[n,s]=K(r?.username??""),[o,i]=K(""),[y,h]=K(""),[N,a]=K(!1),[p,c]=K(void 0),f=n.trim(),b=f!==""&&o.trim()!==""&&!N,k=async()=>{if(!b){c(f===""?t.usernameRequired:t.tokenRequired);return}a(!0),c(void 0);try{await ue({username:f,token:o.trim(),accessKey:y.trim()===""?void 0:y.trim()}),e.settings.close()}catch(m){c(`${t.errorSave}: ${m instanceof Error?m.message:String(m)}`)}finally{a(!1)}};return x(D,{copy:t,title:t.settingsTitle,description:t.settingsDescription,confirmLabel:t.save,confirmDisabled:!b,busy:N,error:p,width:420,onConfirm:k,onCancel:e.settings.close},x("div",{className:"nsw-endpoint"},x("span",{className:"nsw-endpoint-row nsw-identity"},x("span",{className:"nsw-endpoint-key"},t.status),x("span",{className:"nsw-identity-value"},r?.configured===!0?`${t.configured} \xB7 ${r.username??"\u2014"}`:t.unconfigured),r?.configured===!0&&r?.maskedSecret!=null?x("span",{className:"nsw-identity-value","data-masked":"true"},r.maskedSecret):null),x("span",{className:"nsw-endpoint-row"},x("span",{className:"nsw-endpoint-key"},t.endpointLabel),x("code",{className:"nsw-endpoint-value"},r?.endpoint??"\u2014")),x("span",{className:"nsw-endpoint-row"},x("span",{className:"nsw-endpoint-key"},t.bucketLabel),x("code",{className:"nsw-endpoint-value"},r?.bucket??"\u2014"))),x(X,{label:t.username},x(U.Input,{value:n,placeholder:t.usernamePlaceholder,"data-modal-autofocus":!0,onChange:m=>s(m.currentTarget.value)})),x(X,{label:t.token},x(U.Input,{type:"password",value:o,placeholder:r?.configured===!0?`${t.configured} \xB7 ${r?.maskedSecret??""}`:t.tokenPlaceholder,onChange:m=>i(m.currentTarget.value)})),x(X,{label:t.accessKeyOptional},x(U.Input,{value:y,placeholder:t.accessKeyPlaceholder,onChange:m=>h(m.currentTarget.value)})),x("p",{className:"nsw-join-hint"},t.joinHint))}var Ne=F(T("react"),1);var{createElement:H}=Ne.default;function Je(e){let r=e?.data??{};if(e?.type==="user/message")return{role:"user",text:(r.content??[]).filter(n=>n?.type==="text").map(n=>n.text).join(`
`)};if(e?.type==="assistant/message"){let t=(r.message?.content??[]).filter(s=>s?.type==="text").map(s=>s.text).join(`
`);return{role:"assistant",text:[(r.message?.content??[]).filter(s=>s?.type==="reasoning").map(s=>s.text).join(`
`),t].filter(Boolean).join(`

`)}}return e?.type==="tool/call"?{role:"tool",text:`${r.name??r.tool??"tool"} ${JSON.stringify(r.input??r.args??{}).slice(0,160)}`}:null}function Se({face:e,transcript:r}){let t=e.copy(),n=r?.events??[],s=n.map(Je).filter(o=>o!==null&&o.text.trim()!=="");return H(D,{copy:t,title:r?.meta?.title??t.transcriptFallback,confirmLabel:t.closeLabel??"Close",onConfirm:e.onCloseTranscript,onCancel:e.onCloseTranscript},H("div",{className:"nsw-transcript-meta"},`${r?.meta?.writerName??"?"} \xB7 ${r?.meta?.mtime??""} \xB7 ${n.length} events \xB7 ${r?.meta?.committedBytes??0}B`),H("div",{className:"nsw-transcript-body"},s.length===0?H("p",{className:"nsw-notice"},t.transcriptEmpty):s.map((o,i)=>H("div",{key:i,className:`nsw-transcript-row nsw-role-${o.role}`},H("span",{className:"nsw-transcript-role"},t[`role_${o.role}`]??o.role),H("span",{className:"nsw-transcript-text"},o.text)))))}var Q=F(T("react"),1);var{createElement:v,useEffect:Ke,useRef:_e,useState:M}=Q.default;function Ce({face:e,mode:r,workspaceId:t}){let n=e.copy(),[s,o]=M(""),[i,y]=M(null),[h,N]=M(null),[a,p]=M(!1),[c,f]=M(""),[b,k]=M(!1),[m,C]=M(null),I=_e(0),g=u=>{let W=++I.current;k(!0),e.listDirectory(u).then(S=>{I.current===W&&y(S)}).catch(S=>C(S instanceof Error?S.message:String(S))).finally(()=>{I.current===W&&k(!1)})};Ke(()=>{g(void 0)},[]);let l=u=>{k(!0),(r==="join"?e.joinWorkspace(t,u):e.createWorkspace(s.trim(),u)).then(()=>e.onCloseCreateDialog?.(!0)).catch(S=>C(`${n.createFailed}: ${S instanceof Error?S.message:String(S)}`)).finally(()=>k(!1))},R=r==="join"||s.trim()!=="";return v(D,{copy:n,title:r==="join"?n.pickReplicaTitle:n.createTitle,confirmLabel:r==="join"?n.joinHere:n.createHere,confirmDisabled:!R||b||i===null,busy:b,onConfirm:()=>l(h??i?.path),onCancel:()=>e.onCloseCreateDialog?.(!1)},v("div",{className:"nsw-create-body"},r==="create"?v("label",{className:"nsw-field"},v("span",{className:"nsw-field-label"},n.workspaceName),v("input",{className:"nsw-input",value:s,onChange:u=>o(u.target.value),placeholder:n.workspaceNameHint})):null,v("p",{className:"nsw-field-label"},n.pickReplicaHint),v("div",{className:"nsw-crumbs"},(i?.crumbs??[]).map((u,W)=>v(Q.default.Fragment,{key:u.path},W>0?v("span",{className:"nsw-crumb-sep"},"/"):null,v("button",{type:"button",className:"nsw-crumb",onClick:()=>g(u.path)},u.name===""?"/":u.name)))),v("div",{className:"nsw-entries"},b&&i===null?v("p",{className:"nsw-notice"},n.loading):null,(i?.entries??[]).filter(u=>!u.hidden).map(u=>v("button",{type:"button",key:u.path,className:`nsw-entry${h===u.path?" nsw-entry-selected":""}`,onClick:()=>N(u.path),onDoubleClick:()=>g(u.path)},u.name)),i!==null&&(i.entries??[]).filter(u=>!u.hidden).length===0?v("p",{className:"nsw-notice"},n.emptyDir):null),a?v("div",{className:"nsw-new-folder"},v("input",{className:"nsw-input",value:c,onChange:u=>f(u.target.value),placeholder:n.newFolder}),v("button",{type:"button",className:"nsw-button",disabled:c.trim()===""||b,onClick:()=>{k(!0),e.createDirectory(i.path,c.trim()).then(u=>{p(!1),f(""),N(u),g(i.path)}).catch(u=>C(u instanceof Error?u.message:String(u))).finally(()=>k(!1))}},n.createFolder)):v("button",{type:"button",className:"nsw-link-button",onClick:()=>p(!0)},`\uFF0B ${n.newFolder}`),m!==null?v("p",{className:"nsw-notice"},m):null))}var Te="data-nano-shared-workspace";function Ue(){return document.querySelector('[role="tree"]')}function Ee(){let e=Ue();for(;e!==null&&e!==document.body;){let r=e.parentElement;if(r!==null&&r.querySelector(":scope > nav")!==null)return e;e=r}for(let r of document.querySelectorAll("nav")){if(r.parentElement===null)continue;let n=r.nextElementSibling;if(n!==null&&n.tagName==="DIV"&&n.querySelector("nav")===null)return n}return null}function Z(){let e=Ee();return e===null?!0:e.getBoundingClientRect().width>80}function ee(){let e=Ee();if(e===null)return null;let r=e.querySelector(`[${Te}]`);return r===null?(r=document.createElement("div"),r.setAttribute(Te,""),r.className="nsw-graft",e.prepend(r)):r!==e.firstElementChild&&e.prepend(r),r}function je({face:e,renderSlot:r}){let[t,n]=j.default.useState(()=>ee()),[s,o]=j.default.useState(()=>Z()),[i,y]=j.default.useState(e.settings.current);return j.default.useEffect(()=>e.settings.subscribe(y),[]),j.default.useEffect(()=>{let h=new MutationObserver(()=>{n(ee()),o(Z())});return h.observe(document.body,{childList:!0,subtree:!0,attributes:!0}),n(ee()),o(Z()),()=>{h.disconnect(),t?.remove()}},[]),t===null?null:j.default.createElement(j.default.Fragment,null,(0,B.createPortal)(j.default.createElement(ce,{face:e,wide:s}),t),i?.open===!0?(0,B.createPortal)(j.default.createElement(ve,{face:e,settings:i}),document.body):null,i?.transcript!=null?(0,B.createPortal)(j.default.createElement(Se,{face:e,transcript:i.transcript}),document.body):null,typeof i?.notice=="string"&&i.notice!==""?(0,B.createPortal)(j.default.createElement(D,{copy:e.copy(),title:e.copy().noticeTitle,confirmLabel:e.copy().closeLabel,onConfirm:e.dismissNotice,onCancel:e.dismissNotice},i.notice),document.body):null,i?.createDialog!=null?(0,B.createPortal)(j.default.createElement(Ce,{face:e,mode:i.createDialog.mode,workspaceId:i.createDialog.workspaceId}),document.body):null)}var Oe={zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A",railTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A",settings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",viewOptions:"\u89C6\u56FE\u9009\u9879",addWorkspace:"\u6DFB\u52A0\u5171\u4EAB\u5DE5\u4F5C\u533A",filterAll:"\u5168\u90E8\u5171\u4EAB\u5DE5\u4F5C\u533A",filterMine:"\u53EA\u770B\u6211\u52A0\u5165\u7684",workspaceCreated:"\u5DF2\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",createFailed:"\u521B\u5EFA\u5DE5\u4F5C\u533A\u5931\u8D25",enterFailed:"\u65E0\u6CD5\u8FDB\u5165\u8FD9\u4E2A\u5171\u4EAB\u5DE5\u4F5C\u533A",pullFailed:"\u65E0\u6CD5\u4ECE\u5171\u4EAB\u7A7A\u95F4\u8F7D\u5165\u8FD9\u4E2A\u4F1A\u8BDD",noticeTitle:"\u65E0\u6CD5\u6253\u5F00",workspaceAddLocal:"\u6DFB\u52A0\u5DE5\u4F5C\u533A",creating:"\u6B63\u5728\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A\u2026",syncPushed:"\u5DF2\u63A8\u9001",transcriptFallback:"\u8FDC\u7A0B\u4F1A\u8BDD",transcriptEmpty:"\u8BE5\u4F1A\u8BDD\u6682\u65E0\u53EF\u8BFB\u5185\u5BB9",transcriptFailed:"\u8BFB\u53D6\u4F1A\u8BDD\u5931\u8D25",role_user:"\u7528\u6237",role_assistant:"\u52A9\u624B",role_tool:"\u5DE5\u5177",createTitle:"\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",pickReplicaTitle:"\u52A0\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",workspaceName:"\u5DE5\u4F5C\u533A\u540D\u79F0",workspaceNameHint:"\u4F8B\u5982 team-portal",pickReplicaHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u5B58\u653E\u4F4D\u7F6E\uFF08\u4E91\u7AEF\u624D\u662F\u771F\u6E90\uFF09",loading:"\u52A0\u8F7D\u76EE\u5F55\u2026",emptyDir:"\u8BE5\u76EE\u5F55\u4E3A\u7A7A",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",createFolder:"\u521B\u5EFA",createHere:"\u521B\u5EFA\u5230\u6B64\u76EE\u5F55",joinHere:"\u52A0\u5165\u5230\u6B64\u76EE\u5F55",joinHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u4F4D\u7F6E\u4EE5\u52A0\u5165",closeLabel:"\u5173\u95ED",settingsTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A\u8BBE\u7F6E",settingsDescription:"\u8EAB\u4EFD\u5199\u5165\u51ED\u636E\u5B58\u50A8\uFF1BS3 \u771F\u6E90\u7AEF\u70B9\u5728\u670D\u52A1\u7AEF\u914D\u7F6E\u4E2D\u56FA\u5B9A\u3002",username:"\u7528\u6237\u540D",usernamePlaceholder:"\u5728\u5171\u4EAB\u7A7A\u95F4\u663E\u793A\u7684\u540D\u5B57",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key \u6216\u670D\u52A1\u7AEF\u4EE4\u724C",accessKeyOptional:"\u8BBF\u95EE\u5BC6\u94A5\uFF08\u53EF\u9009\uFF09",accessKeyPlaceholder:"\u72EC\u7ACB access key \u65F6\u586B\u5199",endpointLabel:"\u7AEF\u70B9",bucketLabel:"\u5B58\u50A8\u6876",status:"\u72B6\u6001",configured:"\u5DF2\u914D\u7F6E",unconfigured:"\u672A\u914D\u7F6E",emptyHint:"\u8BF7\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",stateJoined:"\u5DF2\u52A0\u5165",stateIdle:"\u672A\u52A0\u5165",usernameRequired:"\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A",tokenRequired:"MinIO Token \u4E0D\u80FD\u4E3A\u7A7A",saved:"\u5DF2\u4FDD\u5B58",clear:"\u6E05\u9664",clearTitle:"\u6E05\u9664\u5171\u4EAB\u51ED\u636E",clearBody:"\u5220\u9664\u672C\u673A\u4FDD\u5B58\u7684\u7528\u6237\u540D\u548C MinIO Token\uFF0C\u5E76\u65AD\u5F00\u5171\u4EAB\u7A7A\u95F4\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",cancel:"\u53D6\u6D88",confirm:"\u4FDD\u5B58",close:"\u5173\u95ED",save:"\u4FDD\u5B58",joinHint:"\u591A\u53F0\u5BA2\u6237\u7AEF\u4F7F\u7528\u540C\u4E00\u7528\u6237\u540D + Token \u5373\u89C6\u4E3A\u540C\u4E00\u8EAB\u4EFD\u3002",errorLoad:"\u8BFB\u53D6\u8BBE\u7F6E\u5931\u8D25",errorSave:"\u4FDD\u5B58\u5931\u8D25"},en:{title:"Shared Workspace",railTitle:"Shared Workspace",settings:"Settings",refresh:"Refresh",viewOptions:"View options",addWorkspace:"Add shared workspace",filterAll:"All shared workspaces",filterMine:"Only ones I joined",workspaceCreated:"Shared workspace created",createFailed:"Failed to create workspace",enterFailed:"Could not open this shared workspace",pullFailed:"Could not load this session from the shared space",noticeTitle:"Could not open",workspaceAddLocal:"Add workspace",creating:"Creating shared workspace\u2026",syncPushed:"Pushed",transcriptFallback:"Remote session",transcriptEmpty:"Nothing readable in this session yet",transcriptFailed:"Failed to read session",role_user:"User",role_assistant:"Assistant",role_tool:"Tool",createTitle:"New shared workspace",pickReplicaTitle:"Join shared workspace",workspaceName:"Workspace name",workspaceNameHint:"e.g. team-portal",pickReplicaHint:"Pick the local replica location (the cloud is canonical)",loading:"Loading directory\u2026",emptyDir:"This directory is empty",newFolder:"New folder",createFolder:"Create",createHere:"Create here",joinHere:"Join here",joinHint:"Pick a local replica location to join",closeLabel:"Close",settingsTitle:"Shared Workspace Settings",settingsDescription:"Identity is stored in the credential store; the S3 source of truth is fixed in server config.",username:"Username",usernamePlaceholder:"Name shown in the shared space",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key or server token",accessKeyOptional:"Access Key (optional)",accessKeyPlaceholder:"Only for a separate access key",endpointLabel:"Endpoint",bucketLabel:"Bucket",status:"Status",configured:"Configured",unconfigured:"Not configured",emptyHint:"Create a shared workspace",stateJoined:"Joined",stateIdle:"Not joined",usernameRequired:"Username is required",tokenRequired:"MinIO token is required",saved:"Saved",clear:"Clear",clearTitle:"Clear shared credentials",clearBody:"Remove the locally stored username and MinIO token and leave the shared space. This cannot be undone.",cancel:"Cancel",confirm:"Save",close:"Close",save:"Save",joinHint:"Clients sharing the same username + token count as one identity.",errorLoad:"Failed to load settings",errorSave:"Failed to save"}},$=e=>Oe[e==="zh"?"zh":"en"]??Oe.en;var Re=`
.nsw-graft { flex: none; min-height: 0; }
/* The harvested root/list rules are the main workspace scroller (flex:1,
   a 16px fade tail). This section sits above that scroller and stays
   content-sized; otherwise mounting it stretches the sidebar. */
.nsw-graft > * { flex: none; }
.nsw-graft [class*="listArea"],
.nsw-graft [class*="treeBody"],
.nsw-graft [class*="list"] { flex: none; }
.nsw-graft [class*="list"] { padding-bottom: 0; }
.nsw-root {
  --nsw-toolbar-height: 36px;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: none;
}
.nsw-section-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  height: var(--nsw-toolbar-height);
  padding-left: var(--dsh-sidebar-row-padding, 12px);
  padding-right: 2px;
  box-sizing: border-box;
  border-radius: var(--dsw-radius-md, 6px);
  color: var(--dsw-alias-label-tertiary, #999);
}
.nsw-section-label {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: normal;
  text-transform: none;
  line-height: 20px;
  white-space: nowrap;
  color: inherit;
}
.nsw-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0;
}
.nsw-icon-button {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--dsw-radius-sm, 4px);
  padding: 0;
  background: transparent;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #888);
}
@media (hover: hover) {
  .nsw-icon-button:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.06)); }
}
.nsw-icon-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary, #6e29f6);
  outline-offset: -2px;
}
.nsw-body {
  /* No padding/font here: native projectRow/projectText inherit their own
     metrics \u2014 any size on this container overrides their cascade. */
  padding: 0;
  color: var(--dsw-alias-label-secondary, #888);
}
.nsw-empty-hint {
  display: inline-flex;
  align-items: center;
  margin: 0;
  /* Align with a projectRow's icon column, not the section padding edge. */
  padding: 4px 0 4px calc(var(--dsh-sidebar-row-padding, 12px) + 4px);
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 400;
  letter-spacing: normal;
  color: var(--dsw-alias-label-tertiary, #999);
  cursor: pointer;
  text-align: left;
}
.nsw-notice { margin: 4px 0 0; font-size: 11px; color: var(--dsw-alias-label-secondary, #888); }
.nsw-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 0;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  text-align: left;
  border-radius: var(--dsw-radius-sm, 4px);
}
.nsw-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.05)); }
.nsw-row-icon { width: 16px; flex: 0 0 16px; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-row-icon[data-joined="true"] { color: var(--dsw-alias-label-secondary, #ccc); }
.nsw-row-icon[data-joined="false"] { opacity: .55; }
.nsw-row-title { flex: 1 1 auto; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nsw-row-badge { flex: 0 0 auto; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-session-row { padding-left: 14px; }
.nsw-session-indent { width: 12px; }
.nsw-session-row .nsw-row-title { font-size: 12px; color: var(--dsw-alias-label-secondary, #ccc); }
.nsw-transcript-meta { margin-bottom: 10px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-transcript-body { max-height: 56vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; }
.nsw-transcript-row { display: flex; flex-direction: column; gap: 2px; }
.nsw-transcript-role { font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-transcript-text { font-size: 12.5px; white-space: pre-wrap; word-break: break-word; }
.nsw-role-user .nsw-transcript-role { color: #64b5f6; }
.nsw-role-tool .nsw-transcript-text { font-family: var(--dsw-mono, monospace); font-size: 11px; opacity: .8; }
.nsw-create-body { display: flex; flex-direction: column; gap: 8px; min-width: 320px; }
.nsw-field { display: flex; flex-direction: column; gap: 4px; }
.nsw-field-label { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-input {
  padding: 6px 8px; font: inherit; font-size: 12.5px;
  background: var(--dsw-alias-fill-tertiary, rgba(255,255,255,.06));
  border: 1px solid var(--dsw-alias-line-subtle, rgba(255,255,255,.12));
  border-radius: 6px; color: inherit; outline: none;
}
.nsw-input:focus { border-color: var(--dsw-alias-accent, #5b8cff); }
.nsw-crumbs { display: flex; flex-wrap: wrap; gap: 2px; font-size: 11.5px; }
.nsw-crumb { border: none; background: none; padding: 0 2px; font: inherit; color: var(--dsw-alias-accent, #5b8cff); cursor: pointer; }
.nsw-crumb:hover { text-decoration: underline; }
.nsw-crumb-sep { color: var(--dsw-alias-label-tertiary, #999); }
.nsw-entries {
  max-height: 220px; min-height: 80px; overflow-y: auto;
  border: 1px solid var(--dsw-alias-line-subtle, rgba(255,255,255,.12));
  border-radius: 6px; padding: 4px; display: flex; flex-direction: column;
}
.nsw-entry {
  text-align: left; border: none; background: none; font: inherit; font-size: 12.5px;
  padding: 4px 8px; border-radius: 4px; cursor: pointer; color: inherit;
}
.nsw-entry:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06)); }
.nsw-entry-selected { background: var(--dsw-alias-accent-dim, rgba(91,140,255,.18)); }
.nsw-link-button { border: none; background: none; font: inherit; font-size: 11.5px; color: var(--dsw-alias-accent, #5b8cff); cursor: pointer; padding: 0; align-self: flex-start; }
.nsw-new-folder { display: flex; gap: 6px; }
.nsw-footer { display: flex; justify-content: flex-end; margin-top: 12px; }
.nsw-button {
  padding: 6px 14px; font: inherit; font-size: 12.5px; border-radius: 6px;
  border: 1px solid var(--dsw-alias-line-subtle, rgba(255,255,255,.14));
  background: var(--dsw-alias-fill-tertiary, rgba(255,255,255,.08)); color: inherit; cursor: pointer;
}
.nsw-button:disabled { opacity: .45; cursor: default; }
.nsw-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.12)); }
@media (hover: hover) {
  .nsw-empty-hint:hover { color: var(--dsw-alias-label-secondary, #888); text-decoration: underline; }
}
.nsw-rail {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
}
.nsw-rail-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--dsw-radius-md, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #888);
  cursor: pointer;
}
@media (hover: hover) {
  .nsw-rail-button:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.06)); }
}
/* Settings dialog body */
.nsw-endpoint {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.04));
}
.nsw-endpoint-row { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }
.nsw-endpoint-key { flex: none; color: var(--dsw-alias-label-tertiary, #999); min-width: 52px; }
.nsw-endpoint-key[data-long] { min-width: 72px; }
.nsw-identity { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }
.nsw-identity-value {
  font-weight: 500;
  color: var(--dsw-alias-label-primary, inherit);
  word-break: break-all;
}
.nsw-identity-value[data-masked] {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 400;
  color: var(--dsw-alias-label-secondary, #888);
}
.nsw-endpoint-value {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  word-break: break-all;
  color: var(--dsw-alias-label-secondary, #888);
}
.nsw-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.nsw-field-label { font-size: 12px; color: var(--dsw-alias-label-secondary, #888); }
.nsw-join-hint {
  margin: 0;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #999);
}
`;var Ve=["slots","locale","layout","uiWorkspace","workspaces","sessions"],Ye="nanoSharedWorkspace";function Ge(){let e={open:!1,loaded:!1,configured:!1,username:null},r=new Set,t=()=>{for(let n of r)n()};return{get current(){return e},set(n){e={...e,...n},t()},subscribe:n=>(r.add(n),()=>r.delete(n))}}function Xe(e){let r=document.createElement("style");r.dataset.nswStyle="true",r.textContent=Re,document.head.append(r),e.effect(()=>()=>r.remove());let t=()=>e.locale.getSnapshot().active,n=Ge(),s=(a,p)=>Object.values(a?.members??{}).find(c=>c?.username===p)?.localPath??"",o=async a=>{let p=a.replace(/\/+$/,""),c=e.workspaces.list.getSnapshot().items?.find(f=>f.path?.replace(/\/+$/,"")===p);return c||e.workspaces.create({path:a})},i=a=>o(a).then(p=>e.uiWorkspace.openWorkspace(p.workspaceId)),y=(a,p)=>{for(let c of a){let f=s(c,p);f&&o(f).catch(()=>{})}},h=()=>{de().then(a=>(n.set({...a,loaded:!0}),me().then(p=>{let c=p.workspaces??[];n.set({sharedWorkspaces:c}),y(c,a.username)}))).catch(()=>n.set({loaded:!0})),pe().catch(()=>{}),be().then(a=>n.set({sessions:a.sessions??[]})).catch(()=>{})},N={copy:()=>$(t()),settings:{get current(){return n.current},get open(){return n.current.open===!0},subscribe:a=>n.subscribe(()=>a(n.current)),close:()=>n.set({open:!1})},onOpenSettings:()=>{h(),n.set({open:!0})},onRefresh:()=>{n.set({syncing:!0}),he().then(a=>{a.pushed>0&&n.set({notice:`${$(t()).syncPushed} ${a.pushed}`})}).catch(()=>{}).finally(()=>{n.set({syncing:!1}),h()})},onToggleWorkspace:a=>{n.set({expanded:{...n.current.expanded??{},[a]:!0}});let p=(n.current.sharedWorkspaces??[]).find(f=>f.workspaceId===a),c=s(p,n.current.username);c!==""&&(n.set({notice:null}),i(c).catch(f=>n.set({notice:`${$(t()).enterFailed}: ${f instanceof Error?f.message:String(f)}`})))},onOpenSession:a=>{let p=()=>e.sessions.list.getSnapshot().byId?.[a.sessionId]!=null,c=()=>{e.uiWorkspace.openSession(a.sessionId),n.set({notice:null})},f=b=>n.set({notice:`${$(t()).pullFailed}: ${b instanceof Error?b.message:String(b)}`});if(p()){try{c()}catch(b){f(b)}return}n.set({notice:null}),xe(a.workspaceId,a.sessionId).then(()=>e.sessions.refresh()).then(()=>{if(!p())throw new Error($(t()).pullFailed);c()}).catch(f)},dismissNotice:()=>n.set({notice:null}),onCloseTranscript:()=>n.set({transcript:null}),onToggleRail:()=>e.layout?.toggleSidebar?.(),onCreateWorkspace:()=>{n.current.creating!==!0&&n.set({createDialog:{mode:"create"}})},onJoinWorkspace:a=>n.set({createDialog:{mode:"join",workspaceId:a}}),onCloseCreateDialog:a=>{n.set({createDialog:null,creating:!1}),a&&(n.set({notice:$(t()).workspaceCreated}),h())},createWorkspace:(a,p)=>(n.set({creating:!0}),fe(a,p).then(c=>i(p).then(()=>c))),joinWorkspace:(a,p)=>(n.set({creating:!0}),ge(a,p).then(c=>i(p).then(()=>c))),createDirectory:we,listDirectory:ye,uiWorkspace:e.uiWorkspace,onViewOptions:a=>{let p=a?.currentTarget?.getBoundingClientRect?.();if(p===void 0)return;let c=$(t());V({anchor:p,items:[{id:"all",label:c.filterAll,run:()=>n.set({viewFilter:"all"})},{id:"mine",label:c.filterMine,run:()=>n.set({viewFilter:"mine"})},{id:"settings",label:c.settingsTitle??c.settings,run:()=>n.set({open:!0})}]})}};e.effect(()=>e.locale.register(Ye,{zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A"},en:{title:"Shared Workspace"}}),"nano-shared-workspace: dictionaries"),e.effect(()=>e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"nano-shared-workspace.section",inject:()=>({face:N})},je)),"nano-shared-workspace: sidebar graft"),window.__nsw={store:n,ctx:e,face:N},h()}return ze(Qe);})();
		return __nswExport;
	}
});
