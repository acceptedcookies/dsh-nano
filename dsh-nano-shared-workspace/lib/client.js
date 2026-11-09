window.__ModuleLoader__.load({
	id: "dsh-nano-shared-workspace",
	factory: (require) => {
var __nswExport=(()=>{var Qe=Object.create;var Q=Object.defineProperty;var Ze=Object.getOwnPropertyDescriptor;var et=Object.getOwnPropertyNames;var tt=Object.getPrototypeOf,nt=Object.prototype.hasOwnProperty;var L=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(s,n)=>(typeof require<"u"?require:s)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var st=(e,s)=>{for(var n in s)Q(e,n,{get:s[n],enumerable:!0})},he=(e,s,n,t)=>{if(s&&typeof s=="object"||typeof s=="function")for(let c of et(s))!nt.call(e,c)&&c!==n&&Q(e,c,{get:()=>s[c],enumerable:!(t=Ze(s,c))||t.enumerable});return e};var F=(e,s,n)=>(n=e!=null?Qe(tt(e)):{},he(s||!e||!e.__esModule?Q(n,"default",{value:e,enumerable:!0}):n,e)),ot=e=>he(Q({},"__esModule",{value:!0}),e);var xt={};st(xt,{apply:()=>yt,inject:()=>ht});var Ut=L("react");var B=F(L("react"),1),U=L("@deepseek-ai/dsh-client-ui-primitives");function P({copy:e,title:s,description:n,confirmLabel:t,confirmDisabled:c,busy:m,error:d,danger:g,footer:b,maxHeight:N,width:O,region:T,onConfirm:r,onCancel:k,children:o}){return B.default.createElement(U.Modal,{open:!0,onClose:k,title:s,description:n,closeLabel:e.cancel,className:["nano-dialog-card",N===void 0?"":"nano-dialog-capped",O===void 0?"":"nano-dialog-sized",T===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:b??B.default.createElement(B.default.Fragment,null,B.default.createElement(U.Button,{variant:"outline",className:"nano-modal-action",onClick:k},e.cancel),B.default.createElement(U.Button,{variant:g?"danger":"primary",className:"nano-modal-action",disabled:c===!0||m===!0,onClick:r},t??e.confirm))},o,d===void 0?null:B.default.createElement("p",{className:"nano-dialog-error",role:"alert"},d))}var J=F(L("react"),1),{useCallback:St,useEffect:ge,useRef:be,useState:rt}=J.default;function ye({menu:e,actions:s,onClose:n,width:t=208}){let c=be(null),[m,d]=rt(0),g=e===null?[]:s,b=g.length,N=be(g);N.current=g;let O=e===null?null:e.openedAt;if(ge(()=>{O!==null&&d(0)},[O]),ge(()=>{if(e===null)return;let o=i=>{c.current!==null&&!c.current.contains(i.target)&&n()},l=i=>{if(i.key==="Escape"){i.stopPropagation(),n();return}if(i.key==="ArrowDown"){i.preventDefault(),d(u=>(u+1)%b);return}if(i.key==="ArrowUp"){i.preventDefault(),d(u=>(u-1+b)%b);return}i.key==="Enter"&&(i.preventDefault(),n(),N.current[m]?.run())};return document.addEventListener("pointerdown",o,!0),document.addEventListener("keydown",l,!0),()=>{document.removeEventListener("pointerdown",o,!0),document.removeEventListener("keydown",l,!0)}},[e,m,b,n]),e===null||b===0)return null;let T=b*28+8,r=Math.min(e.x,(window.innerWidth||t)-t-8),k=Math.min(e.y,(window.innerHeight||T)-T-8);return J.default.createElement("div",{className:"nano-menu",role:"menu",ref:c,style:{position:"fixed",left:`${Math.max(8,r)}px`,top:`${Math.max(8,k)}px`,minWidth:`${t}px`},"data-nano-menu":"true"},g.map((o,l)=>J.default.createElement(at,{key:o.id,item:o,index:l,active:l===m,onHover:d,onRun:n})))}function at({item:e,index:s,active:n,onHover:t,onRun:c}){return J.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(n),"data-tone":e.tone??"default",onMouseEnter:()=>t(s),onClick:()=>{c(),e.run()}},e.icon===void 0?null:J.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),J.default.createElement("span",{className:"nano-menu-label"},e.label))}var xe=F(L("react"),1),ke=L("react-dom/client");function te(e){let s=document.createElement("div");s.className="nano-menu-host",document.body.appendChild(s);let n=(0,ke.createRoot)(s),t=()=>{n.unmount(),s.remove()},c=e.anchor,m=c.left!==void 0?c.left:c.x,d=c.bottom!==void 0?c.bottom:(c.y??0)+(c.height??0);return n.render(xe.default.createElement(ye,{menu:{x:m,y:d,openedAt:Date.now()},actions:e.items??[],width:e.width,onClose:t})),{close:t}}var D=F(L("react"),1),V=L("react-dom");var se=F(L("react"),1),C=L("@deepseek-ai/dsh-client-ui-primitives"),{createElement:p,useEffect:ve,useLayoutEffect:Se,useRef:it,useState:Y}=se.default;var h=e=>e?.getAttribute?.("class")??"",q=e=>String(e).split(/\s+/).filter(Boolean),H=e=>q(e).filter(s=>!/_wide$/.test(s)).join(" "),z=(e,s)=>{let n=String(e).lastIndexOf("_");return n<0?"":e.slice(0,n+1)+s};function lt(){let e=document.querySelector("[data-nano-shared-workspace]"),s=[...document.querySelectorAll("span")].find(a=>!e?.contains(a)&&a.children.length===0&&(a.textContent?.trim()==="\u5DE5\u4F5C\u533A"||a.textContent?.trim()==="Workspace")),n=s?.parentElement,t=n?.parentElement;if(n==null||t==null)return null;let c=[...t.children].find(a=>/listArea/.test(h(a))),m=c?.querySelector('[role="tree"]'),d=[...t.querySelectorAll('[class*="projectRow"]')].find(a=>!String(a.className).includes("menuOpen"));if(c==null||m==null||d==null)return null;let g=n.querySelector('[class*="searchSlot"]'),b=n.querySelector('[class*="headerActions"]'),N=g?.querySelector(":scope > div"),O=N?.querySelector("button")??g?.querySelector("button");if(g==null||b==null||O==null)return null;let T=d.querySelector('[class*="folder"]'),r=d.querySelector('[class*="chevron"]'),k=[...d.children].find(a=>/Text/.test(h(a))),o=k?.querySelector('[class*="title"]'),l=q(h(r?.querySelector("svg"))).find(a=>/arrow/.test(a)&&!/Open/.test(a))??"",i=q(h(d))[0]??"",u=[...t.querySelectorAll('[class*="sessionRow"]')].find(a=>!String(a.className).includes("selected")),E=H(q(h(u)).filter(a=>!/selected/.test(a)).join(" ")),w=[];for(let a of n.children){let v=getComputedStyle(a);if(v.display==="none"||v.position==="absolute"||v.position==="fixed"||h(a)===""&&a.getBoundingClientRect().width===0)continue;let f=a===s?"label":a===g?"search":a===b?"actions":"other";w.push({slot:f,cls:H(h(a))})}return{root:h(t),header:H(h(n)),template:w,search:h(N),searchButton:H(h(O)),actions:H(h(b)),button:H(h(b.querySelector("button"))),listArea:h(c),treeBody:m.parentElement===c?"":H(h(m.parentElement)),list:h(m),group:q(h(d.closest('[class*="groupSection"]'))).filter(a=>!/drop/.test(a)).join(" "),row:q(h(d)).filter(a=>!/menuOpen|drop/.test(a)).join(" "),folder:q(h(T)).filter(a=>!/Active/.test(a)).join(" "),chevron:h(r),projectText:h(k),title:h(o)||z(i,"title"),rowActions:h([...d.children].find(a=>/Actions/.test(h(a)))),rowButton:H(h(d.querySelector('[class*="rowActions"] button'))),arrow:l,arrowOpen:l?z(l,"arrowOpen"):"",sessionRow:E||z(i,"sessionRow"),selected:z(q(E).find(a=>/sessionRow/.test(a))||z(i,"sessionRow"),"selected"),sessionSlot:h(u?.querySelector('[class*="slot"]'))||z(i,"slot"),sessionTitle:h(u?.querySelector('[class*="title"]'))||z(i,"title"),resting:h(u?.querySelector('[class*="Resting"]'))||z(i,"rowResting"),time:h(u?.querySelector('[class*="time"]'))||z(i,"time")}}function ct(){let[e,s]=Y(null);return Se(()=>{let n=0,t=0,c=()=>{let m=lt();if(m){s(m);return}++n>40||(t=window.setTimeout(c,50))};return c(),()=>window.clearTimeout(t)},[]),e}function dt({label:e}){return p("div",{className:"nsw-bone-header",role:"status","aria-busy":"true","aria-label":e},p("span",{className:"nsw-bone nsw-bone-label"}))}var ne=(e,s,n,t)=>p("button",{type:"button",className:t,title:e,"aria-label":e,...n},s);function Ne({face:e,wide:s}){let n=e.copy(),[t,c]=Y(e.settings.current),[m,d]=Y(()=>e.currentSessionId?.()??null),[g,b]=Y(!1),[N,O]=Y(0),T=it(null),r=ct();Se(()=>e.settings.subscribe(c),[]),ve(()=>e.subscribeSession?.(d),[]);let k=t?.listReady===!0,o=k&&t?.sectionOpen===!0;if(ve(()=>{let y=T.current;if(y==null)return;if(!o){O(0);return}let I=y.firstElementChild?.scrollHeight??0;O(I)},[o,g,t?.sharedWorkspaces,t?.sessions,t?.expanded]),!s)return p("div",{className:"nsw-rail",role:"complementary","aria-label":n.railTitle},p("button",{type:"button",className:"nsw-rail-button",title:n.railTitle,"aria-label":n.railTitle,onClick:e.onToggleRail},p(C.IconGlobeOutlineRegular,{size:16})));if(r==null)return p(dt,{label:n.sectionLoading});let l=t?.expandLimit??3,i=t?.configured===!0,u=t?.username,E=t?.viewFilter??"all",w=t?.expanded??{},a=t?.sessions??[],v=(t?.sharedWorkspaces??[]).filter(y=>E!=="mine"||Object.values(y?.members??{}).some(I=>I?.username===u)),f=y=>a.filter(I=>I.workspaceId===y),A=p("div",{className:r.actions},ne(n.viewOptions,p(C.IconSlidersTwoOutlineRegular,{size:16}),{"aria-haspopup":"menu","data-nsw-view-options":!0,onClick:e.onViewOptions},r.button),ne(n.addWorkspace,p(C.IconProjectAddOutlineRegular,{size:16}),{onClick:e.onCreateWorkspace},r.button)),W=r.template.map((y,I)=>{if(y.slot==="label")return p("span",{key:I,className:`${y.cls} nsw-label-with-expand`},n.title,p("button",{type:"button",className:`${r.button} nsw-expand`,title:o?n.collapseSection:n.expandSection,"aria-label":o?n.collapseSection:n.expandSection,"aria-expanded":o,disabled:!k,onClick:e.onToggleSection},p(C.IconTriangleRightFillRegular,{className:o?`${r.arrow} ${r.arrowOpen}`:r.arrow})));if(y.slot==="search"){let ee=!k||t?.syncing===!0,M=ne(n.refresh,p(C.IconRefreshOutlineRegular,{size:14,className:ee?"nsw-spin":void 0}),{onClick:e.onRefresh},r.searchButton);return p("div",{key:I,className:y.cls},r.search?p("div",{className:r.search},M):M)}return y.slot==="actions"?se.default.cloneElement(A,{key:I,className:y.cls}):p("div",{key:I,className:y.cls})}),X=v.map(y=>{let I=Object.values(y?.members??{}).some(j=>j?.username===u),ee=f(y.workspaceId),M=w[y.workspaceId]===!0,we=M?ee.map(j=>p("div",{role:"treeitem",key:j.sessionId,className:j.sessionId===m&&r.selected?`${r.sessionRow} ${r.selected}`:r.sessionRow,"aria-selected":j.sessionId===m,title:j.mtime??"",onClick:()=>e.onOpenSession?.(j)},p("span",{className:r.sessionSlot}),p("span",{className:r.sessionTitle},j.title||j.sessionId),p("span",{className:r.resting},p("span",{className:r.time},j.writerName??"")))):[];return p("div",{key:y.workspaceId,className:r.group},p("div",{role:"treeitem",className:r.row,"data-nsw-loading":t?.sessionsReady!==!0||t?.pulling?.[y.workspaceId]===!0?"true":void 0,"aria-expanded":M,onClick:()=>I?e.onToggleWorkspace?.(y.workspaceId):e.onJoinWorkspace?.(y.workspaceId)},p("span",{className:r.folder},p(M?C.IconFolderOpenRegular:C.IconFolderCloseRegular)),p("span",{className:r.chevron},p(C.IconTriangleRightFillRegular,{className:M?`${r.arrow} ${r.arrowOpen}`:r.arrow})),p("span",{className:r.projectText},p("span",{className:r.title},y?.title??y?.workspaceId)),I?null:p("span",{className:r.time},n.stateIdle),p("span",{className:r.rowActions,onClick:j=>j.stopPropagation()},t?.sessionsReady!==!0||t?.pulling?.[y.workspaceId]===!0?p("span",{className:r.rowButton,role:"status","aria-label":n.sectionLoading},p(C.IconRefreshOutlineRegular,{size:14,className:"nsw-spin"})):I&&r.rowButton!==""?p("button",{type:"button",className:r.rowButton,"aria-label":n.newSession,onClick:j=>{j.stopPropagation(),e.onCreateSession?.(y.workspaceId)}},p(C.IconNewChatOutlineRegular,{size:14})):null)),we.length>0?p("div",{role:"group"},we):null)}),Ye=v.length===0?p("div",{className:r.group},p("div",{role:"button",className:r.row,onClick:i?e.onCreateWorkspace:e.onOpenSettings},p("span",{className:r.folder}),p("span",{className:r.chevron}),p("span",{className:r.projectText},p("span",{className:r.title},n.emptyHint)))):null,ue=g?X:X.slice(0,l),me=X.length-ue.length,Ge=me>0?p("button",{type:"button",key:"more",className:"nsw-more",onClick:()=>b(!0)},n.showMore.replace("{n}",String(me))):null,fe=p("div",{className:r.list,role:"tree"},ue,Ge,X.length===0?Ye:null),Xe=r.treeBody?p("div",{className:r.treeBody},fe):fe;return p("div",{className:`nsw-root ${r.root}`,role:"complementary","aria-label":n.title},p("div",{className:r.header},...W),p("div",{ref:T,className:"nsw-reveal","data-open":o?"true":"false",style:o?{maxHeight:N}:void 0},p("div",{className:"nsw-reveal-inner"},p("div",{className:r.listArea},Xe))))}var Pe=F(L("react"),1);var Z=L("@deepseek-ai/dsh-client-ui-primitives");var pt="/nano-shared-workspace";async function R(e,s){let n=await fetch(`${pt}${e}`,{credentials:"same-origin",cache:"no-store",...s}),t=await n.json().catch(()=>({}));if(!n.ok)throw new Error(typeof t?.error=="string"?t.error:`HTTP ${n.status}`);return t}var Oe=()=>R("/settings"),Ce=()=>R("/status");function Ee({username:e,token:s,accessKey:n}){return R("/settings/update",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({username:e,token:s,accessKey:n})})}var Te=()=>R("/workspaces");function Re(e,s){return R("/workspaces/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:e,localPath:s})})}function Ie(e,s){return R("/workspaces/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,localPath:s})})}var oe=()=>R("/sync",{method:"POST"});function je(e,s){return R("/mkdir",{method:"POST",body:JSON.stringify({parent:e,name:s})}).then(n=>{if(n?.ok!==!0)throw new Error(n?.error??"mkdir failed");return n.path})}var Le=e=>R("/ls",{method:"POST",body:JSON.stringify(e===void 0?{}:{path:e})}),De=()=>R("/sessions");function re(e){return R("/tree/pull",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e})}).then(s=>{if(s?.ok!==!0)throw new Error(s?.error??"pull failed");return s})}function Ae(e,s){return R("/sessions/bind",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({path:e,sessionId:s})}).then(n=>{if(n?.ok!==!0)throw new Error(n?.error??"bind failed");return n})}function ae(e,s){return R("/sessions/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})}).then(n=>{if(n?.busy===!0)return n;if(n?.ok!==!0)throw new Error(n?.error??"claim failed");return n})}function We(e,s){return R("/sessions/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})})}function $e(e,s){return R("/materialize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})}).then(n=>{if(n?.ok!==!0)throw new Error(n?.error??"materialize failed");return n})}var{createElement:x,useState:G}=Pe.default;function ie({label:e,children:s}){return x("label",{className:"nsw-field"},x("span",{className:"nsw-field-label"},e),s)}function ze({face:e,settings:s}){let n=e.copy(),[t,c]=G(s?.username??""),[m,d]=G(""),[g,b]=G(""),[N,O]=G(!1),[T,r]=G(void 0),k=t.trim(),o=k!==""&&m.trim()!==""&&!N,l=async()=>{if(!o){r(k===""?n.usernameRequired:n.tokenRequired);return}O(!0),r(void 0);try{await Ee({username:k,token:m.trim(),accessKey:g.trim()===""?void 0:g.trim()}),e.settings.close()}catch(i){r(`${n.errorSave}: ${i instanceof Error?i.message:String(i)}`)}finally{O(!1)}};return x(P,{copy:n,title:n.settingsTitle,description:n.settingsDescription,confirmLabel:n.save,confirmDisabled:!o,busy:N,error:T,width:420,onConfirm:l,onCancel:e.settings.close},x("div",{className:"nsw-endpoint"},x("span",{className:"nsw-endpoint-row nsw-identity"},x("span",{className:"nsw-endpoint-key"},n.status),x("span",{className:"nsw-identity-value"},s?.configured===!0?`${n.configured} \xB7 ${s.username??"\u2014"}`:n.unconfigured),s?.configured===!0&&s?.maskedSecret!=null?x("span",{className:"nsw-identity-value","data-masked":"true"},s.maskedSecret):null),x("span",{className:"nsw-endpoint-row"},x("span",{className:"nsw-endpoint-key"},n.endpointLabel),x("code",{className:"nsw-endpoint-value"},s?.endpoint??"\u2014")),x("span",{className:"nsw-endpoint-row"},x("span",{className:"nsw-endpoint-key"},n.bucketLabel),x("code",{className:"nsw-endpoint-value"},s?.bucket??"\u2014"))),x(ie,{label:n.username},x(Z.Input,{value:t,placeholder:n.usernamePlaceholder,"data-modal-autofocus":!0,onChange:i=>c(i.currentTarget.value)})),x(ie,{label:n.token},x(Z.Input,{type:"password",value:m,placeholder:s?.configured===!0?`${n.configured} \xB7 ${s?.maskedSecret??""}`:n.tokenPlaceholder,onChange:i=>d(i.currentTarget.value)})),x(ie,{label:n.accessKeyOptional},x(Z.Input,{value:g,placeholder:n.accessKeyPlaceholder,onChange:i=>b(i.currentTarget.value)})),x("label",{className:"nsw-pref"},x("input",{type:"checkbox",checked:s?.expandOnLoad!==!1,onChange:i=>e.setExpandOnLoad(i.currentTarget.checked)}),x("span",null,x("span",{className:"nsw-field-label"},n.expandOnLoad),x("span",{className:"nsw-join-hint"},n.expandOnLoadHint))),x("p",{className:"nsw-join-hint"},n.joinHint))}var Fe=F(L("react"),1);var{createElement:K}=Fe.default;function ut(e){let s=e?.data??{};if(e?.type==="user/message")return{role:"user",text:(s.content??[]).filter(t=>t?.type==="text").map(t=>t.text).join(`
`)};if(e?.type==="assistant/message"){let n=(s.message?.content??[]).filter(c=>c?.type==="text").map(c=>c.text).join(`
`);return{role:"assistant",text:[(s.message?.content??[]).filter(c=>c?.type==="reasoning").map(c=>c.text).join(`
`),n].filter(Boolean).join(`

`)}}return e?.type==="tool/call"?{role:"tool",text:`${s.name??s.tool??"tool"} ${JSON.stringify(s.input??s.args??{}).slice(0,160)}`}:null}function He({face:e,transcript:s}){let n=e.copy(),t=s?.events??[],c=t.map(ut).filter(m=>m!==null&&m.text.trim()!=="");return K(P,{copy:n,title:s?.meta?.title??n.transcriptFallback,confirmLabel:n.closeLabel??"Close",onConfirm:e.onCloseTranscript,onCancel:e.onCloseTranscript},K("div",{className:"nsw-transcript-meta"},`${s?.meta?.writerName??"?"} \xB7 ${s?.meta?.mtime??""} \xB7 ${t.length} events \xB7 ${s?.meta?.committedBytes??0}B`),K("div",{className:"nsw-transcript-body"},c.length===0?K("p",{className:"nsw-notice"},n.transcriptEmpty):c.map((m,d)=>K("div",{key:d,className:`nsw-transcript-row nsw-role-${m.role}`},K("span",{className:"nsw-transcript-role"},n[`role_${m.role}`]??m.role),K("span",{className:"nsw-transcript-text"},m.text)))))}var le=F(L("react"),1);var{createElement:S,useEffect:mt,useRef:ft,useState:_}=le.default;function qe({face:e,mode:s,workspaceId:n}){let t=e.copy(),[c,m]=_(""),[d,g]=_(null),[b,N]=_(null),[O,T]=_(!1),[r,k]=_(""),[o,l]=_(!1),[i,u]=_(null),E=ft(0),w=f=>{let A=++E.current;l(!0),e.listDirectory(f).then(W=>{E.current===A&&g(W)}).catch(W=>u(W instanceof Error?W.message:String(W))).finally(()=>{E.current===A&&l(!1)})};mt(()=>{w(void 0)},[]);let a=f=>{l(!0),(s==="join"?e.joinWorkspace(n,f):e.createWorkspace(c.trim(),f)).then(()=>e.onCloseCreateDialog?.(!0)).catch(W=>u(`${t.createFailed}: ${W instanceof Error?W.message:String(W)}`)).finally(()=>l(!1))},v=s==="join"||c.trim()!=="";return S(P,{copy:t,title:s==="join"?t.pickReplicaTitle:t.createTitle,confirmLabel:s==="join"?t.joinHere:t.createHere,confirmDisabled:!v||o||d===null,busy:o,onConfirm:()=>a(b??d?.path),onCancel:()=>e.onCloseCreateDialog?.(!1)},S("div",{className:"nsw-create-body"},s==="create"?S("label",{className:"nsw-field"},S("span",{className:"nsw-field-label"},t.workspaceName),S("input",{className:"nsw-input",value:c,onChange:f=>m(f.target.value),placeholder:t.workspaceNameHint})):null,S("p",{className:"nsw-field-label"},t.pickReplicaHint),S("div",{className:"nsw-crumbs"},(d?.crumbs??[]).map((f,A)=>S(le.default.Fragment,{key:f.path},A>0?S("span",{className:"nsw-crumb-sep"},"/"):null,S("button",{type:"button",className:"nsw-crumb",onClick:()=>w(f.path)},f.name===""?"/":f.name)))),S("div",{className:"nsw-entries"},o&&d===null?S("p",{className:"nsw-notice"},t.loading):null,(d?.entries??[]).filter(f=>!f.hidden).map(f=>S("button",{type:"button",key:f.path,className:`nsw-entry${b===f.path?" nsw-entry-selected":""}`,onClick:()=>N(f.path),onDoubleClick:()=>w(f.path)},f.name)),d!==null&&(d.entries??[]).filter(f=>!f.hidden).length===0?S("p",{className:"nsw-notice"},t.emptyDir):null),O?S("div",{className:"nsw-new-folder"},S("input",{className:"nsw-input",value:r,onChange:f=>k(f.target.value),placeholder:t.newFolder}),S("button",{type:"button",className:"nsw-button",disabled:r.trim()===""||o,onClick:()=>{l(!0),e.createDirectory(d.path,r.trim()).then(f=>{T(!1),k(""),N(f),w(d.path)}).catch(f=>u(f instanceof Error?f.message:String(f))).finally(()=>l(!1))}},t.createFolder)):S("button",{type:"button",className:"nsw-link-button",onClick:()=>T(!0)},`\uFF0B ${t.newFolder}`),i!==null?S("p",{className:"nsw-notice"},i):null))}var Me="data-nano-shared-workspace";function wt(){return document.querySelector('[role="tree"]')}function Be(){let e=wt();for(;e!==null&&e!==document.body;){let s=e.parentElement;if(s!==null&&s.querySelector(":scope > nav")!==null)return e;e=s}for(let s of document.querySelectorAll("nav")){if(s.parentElement===null)continue;let t=s.nextElementSibling;if(t!==null&&t.tagName==="DIV"&&t.querySelector("nav")===null)return t}return null}function ce(){let e=Be();return e===null?!0:e.getBoundingClientRect().width>80}function de(){let e=Be();if(e===null)return null;let s=e.querySelector(`[${Me}]`);return s===null?(s=document.createElement("div"),s.setAttribute(Me,""),s.className="nsw-graft",e.prepend(s)):s!==e.firstElementChild&&e.prepend(s),s}function Je({face:e,renderSlot:s}){let[n,t]=D.default.useState(()=>de()),[c,m]=D.default.useState(()=>ce()),[d,g]=D.default.useState(e.settings.current);return D.default.useEffect(()=>e.settings.subscribe(g),[]),D.default.useEffect(()=>{let b=new MutationObserver(()=>{t(de()),m(ce())});return b.observe(document.body,{childList:!0,subtree:!0,attributes:!0}),t(de()),m(ce()),()=>{b.disconnect(),n?.remove()}},[]),n===null?null:D.default.createElement(D.default.Fragment,null,(0,V.createPortal)(D.default.createElement(Ne,{face:e,wide:c}),n),d?.open===!0?(0,V.createPortal)(D.default.createElement(ze,{face:e,settings:d}),document.body):null,d?.transcript!=null?(0,V.createPortal)(D.default.createElement(He,{face:e,transcript:d.transcript}),document.body):null,typeof d?.notice=="string"&&d.notice!==""?(0,V.createPortal)(D.default.createElement(P,{copy:e.copy(),title:e.copy().noticeTitle,confirmLabel:e.copy().closeLabel,onConfirm:e.dismissNotice,onCancel:e.dismissNotice},d.notice),document.body):null,d?.createDialog!=null?(0,V.createPortal)(D.default.createElement(qe,{face:e,mode:d.createDialog.mode,workspaceId:d.createDialog.workspaceId}),document.body):null)}var Ke={zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A",railTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A",settings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",viewOptions:"\u89C6\u56FE\u9009\u9879",addWorkspace:"\u6DFB\u52A0\u5171\u4EAB\u5DE5\u4F5C\u533A",filterAll:"\u5168\u90E8\u5171\u4EAB\u5DE5\u4F5C\u533A",filterMine:"\u53EA\u770B\u6211\u52A0\u5165\u7684",workspaceCreated:"\u5DF2\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",createFailed:"\u521B\u5EFA\u5DE5\u4F5C\u533A\u5931\u8D25",enterFailed:"\u65E0\u6CD5\u8FDB\u5165\u8FD9\u4E2A\u5171\u4EAB\u5DE5\u4F5C\u533A",pullFailed:"\u65E0\u6CD5\u4ECE\u5171\u4EAB\u7A7A\u95F4\u8F7D\u5165\u8FD9\u4E2A\u4F1A\u8BDD",noticeTitle:"\u65E0\u6CD5\u6253\u5F00",workspaceAddLocal:"\u6DFB\u52A0\u5DE5\u4F5C\u533A",creating:"\u6B63\u5728\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A\u2026",syncPushed:"\u5DF2\u63A8\u9001",transcriptFallback:"\u8FDC\u7A0B\u4F1A\u8BDD",transcriptEmpty:"\u8BE5\u4F1A\u8BDD\u6682\u65E0\u53EF\u8BFB\u5185\u5BB9",transcriptFailed:"\u8BFB\u53D6\u4F1A\u8BDD\u5931\u8D25",role_user:"\u7528\u6237",role_assistant:"\u52A9\u624B",role_tool:"\u5DE5\u5177",createTitle:"\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",pickReplicaTitle:"\u52A0\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",workspaceName:"\u5DE5\u4F5C\u533A\u540D\u79F0",workspaceNameHint:"\u4F8B\u5982 team-portal",pickReplicaHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u5B58\u653E\u4F4D\u7F6E\uFF08\u4E91\u7AEF\u624D\u662F\u771F\u6E90\uFF09",loading:"\u52A0\u8F7D\u76EE\u5F55\u2026",emptyDir:"\u8BE5\u76EE\u5F55\u4E3A\u7A7A",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",createFolder:"\u521B\u5EFA",createHere:"\u521B\u5EFA\u5230\u6B64\u76EE\u5F55",joinHere:"\u52A0\u5165\u5230\u6B64\u76EE\u5F55",joinHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u4F4D\u7F6E\u4EE5\u52A0\u5165",readOnlyBusy:"\u53EA\u8BFB\uFF1A{holder} \u6B63\u5728\u5199\u8FD9\u6761\u4F1A\u8BDD\uFF0C\u79DF\u7EA6\u7ED3\u675F\u524D\u4E0D\u80FD\u5360\u7528",closeLabel:"\u5173\u95ED",settingsTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A\u8BBE\u7F6E",settingsDescription:"\u8EAB\u4EFD\u5199\u5165\u51ED\u636E\u5B58\u50A8\uFF1BS3 \u771F\u6E90\u7AEF\u70B9\u5728\u670D\u52A1\u7AEF\u914D\u7F6E\u4E2D\u56FA\u5B9A\u3002",username:"\u7528\u6237\u540D",usernamePlaceholder:"\u5728\u5171\u4EAB\u7A7A\u95F4\u663E\u793A\u7684\u540D\u5B57",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key \u6216\u670D\u52A1\u7AEF\u4EE4\u724C",accessKeyOptional:"\u8BBF\u95EE\u5BC6\u94A5\uFF08\u53EF\u9009\uFF09",accessKeyPlaceholder:"\u72EC\u7ACB access key \u65F6\u586B\u5199",endpointLabel:"\u7AEF\u70B9",bucketLabel:"\u5B58\u50A8\u6876",status:"\u72B6\u6001",configured:"\u5DF2\u914D\u7F6E",unconfigured:"\u672A\u914D\u7F6E",emptyHint:"\u8BF7\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",sectionLoading:"\u6B63\u5728\u8F7D\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",newSession:"\u65B0\u5EFA\u4F1A\u8BDD",expandSection:"\u5C55\u5F00\u5171\u4EAB\u5DE5\u4F5C\u533A",collapseSection:"\u6536\u8D77\u5171\u4EAB\u5DE5\u4F5C\u533A",showMore:"\u5C55\u5F00\u5176\u4F59 {n} \u4E2A",expandOnLoad:"\u52A0\u8F7D\u5B8C\u6210\u540E\u5C55\u5F00\u5DE5\u4F5C\u533A",expandOnLoadHint:"\u9ED8\u8BA4\u5C55\u5F00\u524D 3 \u4E2A\uFF0C\u5176\u4F59\u6536\u8D77\uFF0C\u53EF\u518D\u624B\u52A8\u5C55\u5F00\u3002",stateJoined:"\u5DF2\u52A0\u5165",stateIdle:"\u672A\u52A0\u5165",usernameRequired:"\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A",tokenRequired:"MinIO Token \u4E0D\u80FD\u4E3A\u7A7A",saved:"\u5DF2\u4FDD\u5B58",clear:"\u6E05\u9664",clearTitle:"\u6E05\u9664\u5171\u4EAB\u51ED\u636E",clearBody:"\u5220\u9664\u672C\u673A\u4FDD\u5B58\u7684\u7528\u6237\u540D\u548C MinIO Token\uFF0C\u5E76\u65AD\u5F00\u5171\u4EAB\u7A7A\u95F4\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",cancel:"\u53D6\u6D88",confirm:"\u4FDD\u5B58",close:"\u5173\u95ED",save:"\u4FDD\u5B58",joinHint:"\u591A\u53F0\u5BA2\u6237\u7AEF\u4F7F\u7528\u540C\u4E00\u7528\u6237\u540D + Token \u5373\u89C6\u4E3A\u540C\u4E00\u8EAB\u4EFD\u3002",errorLoad:"\u8BFB\u53D6\u8BBE\u7F6E\u5931\u8D25",errorSave:"\u4FDD\u5B58\u5931\u8D25"},en:{title:"Shared Workspace",railTitle:"Shared Workspace",settings:"Settings",refresh:"Refresh",viewOptions:"View options",addWorkspace:"Add shared workspace",filterAll:"All shared workspaces",filterMine:"Only ones I joined",workspaceCreated:"Shared workspace created",createFailed:"Failed to create workspace",enterFailed:"Could not open this shared workspace",pullFailed:"Could not load this session from the shared space",noticeTitle:"Could not open",workspaceAddLocal:"Add workspace",creating:"Creating shared workspace\u2026",syncPushed:"Pushed",transcriptFallback:"Remote session",transcriptEmpty:"Nothing readable in this session yet",transcriptFailed:"Failed to read session",role_user:"User",role_assistant:"Assistant",role_tool:"Tool",createTitle:"New shared workspace",pickReplicaTitle:"Join shared workspace",workspaceName:"Workspace name",workspaceNameHint:"e.g. team-portal",pickReplicaHint:"Pick the local replica location (the cloud is canonical)",loading:"Loading directory\u2026",emptyDir:"This directory is empty",newFolder:"New folder",createFolder:"Create",createHere:"Create here",joinHere:"Join here",joinHint:"Pick a local replica location to join",readOnlyBusy:"Read-only: {holder} holds this session until the lease expires",closeLabel:"Close",settingsTitle:"Shared Workspace Settings",settingsDescription:"Identity is stored in the credential store; the S3 source of truth is fixed in server config.",username:"Username",usernamePlaceholder:"Name shown in the shared space",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key or server token",accessKeyOptional:"Access Key (optional)",accessKeyPlaceholder:"Only for a separate access key",endpointLabel:"Endpoint",bucketLabel:"Bucket",status:"Status",configured:"Configured",unconfigured:"Not configured",emptyHint:"Create a shared workspace",sectionLoading:"Loading shared workspaces",newSession:"New session",expandSection:"Expand shared workspaces",collapseSection:"Collapse shared workspaces",showMore:"Show {n} more",expandOnLoad:"Expand after loading",expandOnLoadHint:"Shows the first 3, and keeps the rest collapsed until you ask.",stateJoined:"Joined",stateIdle:"Not joined",usernameRequired:"Username is required",tokenRequired:"MinIO token is required",saved:"Saved",clear:"Clear",clearTitle:"Clear shared credentials",clearBody:"Remove the locally stored username and MinIO token and leave the shared space. This cannot be undone.",cancel:"Cancel",confirm:"Save",close:"Close",save:"Save",joinHint:"Clients sharing the same username + token count as one identity.",errorLoad:"Failed to load settings",errorSave:"Failed to save"}},$=e=>Ke[e==="zh"?"zh":"en"]??Ke.en;var _e=`
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
.nsw-label-with-expand { display: inline-flex; align-items: center; gap: 2px; }
.nsw-expand { width: 16px; height: 16px; }
.nsw-expand:disabled { opacity: .35; cursor: default; }
.nsw-spin { animation: nsw-spin .8s linear infinite; transform-origin: center; }
/* Row padding keeps a trailing icon inside the row. The section header pulls its
   buttons out to the sidebar edge, so the loading mark uses that same inset. */
[data-nsw-loading="true"] [class*="rowActions"] {
  display: inline-flex;
  margin-right: calc(var(--dsh-sidebar-paint-inset, 4px) - (var(--dsh-sidebar-row-padding, 12px)));
}
@keyframes nsw-spin { to { transform: rotate(360deg); } }
/* Duration covers the real height, not a 70vh ceiling. A short declared time
   on an oversized max-height finishes the visible push in a few frames. */
.nsw-reveal { overflow: hidden; max-height: 0; transition: max-height 680ms cubic-bezier(0.22, 1, 0.36, 1); }
.nsw-reveal-inner { min-height: 0; }
.nsw-more {
  display: block; width: 100%; height: 28px; margin-top: 2px;
  border: none; background: transparent; cursor: pointer; text-align: left;
  padding: 0 var(--dsh-sidebar-row-padding, 12px);
  font: inherit; font-size: 12px; color: var(--dsw-alias-label-tertiary, #999);
}
.nsw-more:hover { color: var(--dsw-alias-label-secondary, #ccc); }
.nsw-pref { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 12px; font-size: 12.5px; }
.nsw-pref input { margin-top: 2px; }
@media (prefers-reduced-motion: reduce) {
  .nsw-spin { animation: none; }
  .nsw-reveal { transition: none; }
}
/* Same pulse as the workspace search skeleton (opacity 1 \u2192 .6 \u2192 1 over 2s).
   It runs only while the shared list is unresolved, then the nodes unmount. */
.nsw-bone {
  flex: none;
  background: var(--dsw-alias-bg-skeleton, rgba(255,255,255,.08));
  animation: nsw-heartbeat 2s cubic-bezier(0.36, 0, 0.64, 1) infinite;
}
.nsw-bone-row {
  display: flex;
  align-items: center;
  height: 34px;
  gap: var(--dsh-sidebar-label-gap, 8px);
  padding-inline-start: var(--dsh-sidebar-row-padding, 12px);
  box-sizing: border-box;
}
.nsw-bone-dot { width: 16px; height: 16px; border-radius: 4px; }
.nsw-bone-bar { height: 14px; width: 42%; border-radius: var(--dsw-radius-xs, 4px); }
.nsw-bone-bar[data-width="mid"] { width: 58%; }
.nsw-bone-bar[data-width="short"] { width: 30%; }
.nsw-bone-header {
  display: flex;
  align-items: center;
  height: 36px;
  padding-left: var(--dsh-sidebar-row-padding, 12px);
  gap: 8px;
}
.nsw-bone-label { width: 72px; height: 14px; border-radius: var(--dsw-radius-xs, 4px); }
.nsw-bone-actions { margin-left: auto; display: inline-flex; gap: 4px; }
.nsw-bone-icon { width: 16px; height: 16px; border-radius: 4px; }
@keyframes nsw-heartbeat {
  0% { opacity: 1; }
  40% { opacity: .6; }
  80%, 100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .nsw-bone { animation: none; }
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
`;var ht=["slots","locale","layout","uiWorkspace","workspaces","sessions"],gt="nanoSharedWorkspace",Ve="nsw-section-prefs",pe=3;function Ue(){try{return{expandOnLoad:JSON.parse(localStorage.getItem(Ve)||"")?.expandOnLoad!==!1,expandLimit:pe}}catch{return{expandOnLoad:!0,expandLimit:pe}}}function bt(){let e={open:!1,loaded:!1,configured:!1,username:null,sessionsReady:!1,pulling:{},...Ue()},s=new Set,n=()=>{for(let t of s)t()};return{get current(){return e},set(t){e={...e,...t},n()},subscribe:t=>(s.add(t),()=>s.delete(t))}}function yt(e){let s=document.createElement("style");s.dataset.nswStyle="true",s.textContent=_e,document.head.append(s),e.effect(()=>()=>s.remove());let n=()=>e.locale.getSnapshot().active,t=bt(),c=(o,l)=>Object.values(o?.members??{}).find(i=>i?.username===l)?.localPath??"",m=()=>{let o=document.querySelector("[data-nano-shared-workspace]"),l=t.current.username,i=new Set;for(let w of t.current.sharedWorkspaces??[]){let a=c(w,l);a&&i.add(a.replace(/\/+$/,""))}let u=new Set([...(t.current.sessions??[]).map(w=>w.sessionId),...t.current.ownedSessionIds??[]]),E=new Set((e.workspaces.list.getSnapshot().items??[]).filter(w=>i.has(w.path?.replace(/\/+$/,""))).map(w=>w.workspaceId));for(let w of document.querySelectorAll('[data-row-key^="workspace:"]')){if(o?.contains(w))continue;let a=w.getAttribute("data-row-key").slice(10),v=w.closest('[class*="groupSection"]')??w,f=E.has(a);v.hidden!==f&&(v.hidden=f)}for(let w of document.querySelectorAll('[data-row-key^="session:"]')){if(o?.contains(w))continue;let a=w.getAttribute("data-row-key").slice(8),v=u.has(a);w.hidden!==v&&(w.hidden=v)}for(let w of document.querySelectorAll('[data-row-key="workspace:"]')){if(o?.contains(w))continue;let a=w.closest('[class*="groupSection"]')??w.parentElement;if(a==null)continue;let v=[...a.querySelectorAll('[data-row-key^="session:"]')],f=v.length>0&&v.every(A=>A.hidden);a.hidden!==f&&(a.hidden=f)}},d=()=>{Oe().then(o=>(t.set({...o,loaded:!0}),Te().then(l=>{let i=l.workspaces??[],u=t.current.listReady!==!0;t.set({sharedWorkspaces:i,listReady:!0,...u?{sectionOpen:Ue().expandOnLoad}:{}}),m()}).catch(()=>t.set({listReady:!0,...t.current.listReady!==!0?{sectionOpen:!1}:{}})))).catch(()=>t.set({loaded:!0,listReady:!0})),Ce().catch(()=>{}),De().then(o=>{t.set({sessions:o.sessions??[],sessionsReady:!0}),m()}).catch(()=>t.set({sessionsReady:!0}))},g=(o,l)=>{let i={...t.current.pulling??{}};l?i[o]=!0:delete i[o],t.set({pulling:i})},b=0,N=(o,l)=>{window.clearInterval(b),b=window.setInterval(()=>{We(o,l).catch(()=>window.clearInterval(b))},25e3)},O=async o=>{let l=o.replace(/\/+$/,""),i=e.workspaces.list.getSnapshot().items?.find(u=>u.path?.replace(/\/+$/,"")===l);return i||e.workspaces.create({path:o})},T=async(o,l)=>{let i=l!=null&&e.sessions.list.getSnapshot().byId?.[l]!=null;l!=null&&!i&&(await $e(o,l),await e.sessions.refresh())},r={copy:()=>$(n()),currentSessionId:()=>{let o=e.sessions.list.getSnapshot().byId??{};return Object.values(o).find(l=>(l.retainedBy?.mainView??0)>0)?.id??null},subscribeSession:o=>e.sessions.list.subscribe(()=>o(Object.values(e.sessions.list.getSnapshot().byId??{}).find(l=>(l.retainedBy?.mainView??0)>0)?.id??null)),settings:{get current(){return t.current},get open(){return t.current.open===!0},subscribe:o=>t.subscribe(()=>o(t.current)),close:()=>t.set({open:!1})},onOpenSettings:()=>{d(),t.set({open:!0})},onToggleSection:()=>{t.current.listReady===!0&&t.set({sectionOpen:t.current.sectionOpen!==!0})},setExpandOnLoad:o=>{let l={expandOnLoad:o===!0,expandLimit:pe};localStorage.setItem(Ve,JSON.stringify(l)),t.set(l)},onRefresh:()=>{t.set({syncing:!0}),oe().then(o=>{o.pushed>0&&t.set({notice:`${$(n()).syncPushed} ${o.pushed}`})}).catch(()=>{}).finally(()=>{t.set({syncing:!1}),d()})},onToggleWorkspace:o=>{let l=t.current.expanded?.[o]===!0;t.set({expanded:{...t.current.expanded??{},[o]:!l}})},onCreateSession:o=>{let l=(t.current.sharedWorkspaces??[]).find(u=>u.workspaceId===o),i=c(l,t.current.username);if(i===""){t.set({notice:$(n()).joinHint});return}t.set({notice:null,sectionOpen:!0,expanded:{...t.current.expanded??{},[o]:!0}}),g(o,!0),re(o).finally(()=>g(o,!1)).then(()=>O(i)).then(u=>e.sessions.create({workspaceId:u.workspaceId})).then(u=>ae(o,u).then(E=>{if(E?.busy===!0)throw new Error($(n()).readOnlyBusy.replace("{holder}",E.holder??""));return N(o,u),u})).then(u=>{let E={workspaceId:o,sessionId:u,title:"",writerName:t.current.username??"",cwd:i};t.set({ownedSessionIds:[...t.current.ownedSessionIds??[],u],sessions:[E,...(t.current.sessions??[]).filter(w=>w.sessionId!==u)]}),m(),e.uiWorkspace.openSession(u),oe().finally(()=>d())}).catch(u=>t.set({notice:`${$(n()).enterFailed}: ${u instanceof Error?u.message:String(u)}`}))},onOpenSession:o=>{t.set({notice:null,sectionOpen:!0,expanded:{...t.current.expanded??{},[o.workspaceId]:!0}});let l=()=>e.sessions.list.getSnapshot().byId?.[o.sessionId]!=null,i=()=>c((t.current.sharedWorkspaces??[]).find(a=>a.workspaceId===o.workspaceId),t.current.username),u=async()=>{let a=i();if(a!==""){let v=await O(a);e.workspaces.list.getSnapshot().items?.find(A=>A.workspaceId===v.workspaceId)?.sessionIds?.includes(o.sessionId)===!0||await Ae(a,o.sessionId)}t.set({ownedSessionIds:[...t.current.ownedSessionIds??[],o.sessionId]}),m(),e.uiWorkspace.openSession(o.sessionId)},E=a=>{if(a?.busy===!0){t.set({notice:$(n()).readOnlyBusy.replace("{holder}",a.holder??"")});return}N(o.workspaceId,o.sessionId)};g(o.workspaceId,!0),(l()?u():T(o.workspaceId,o.sessionId).then(u)).then(()=>Promise.all([re(o.workspaceId).finally(()=>g(o.workspaceId,!1)).catch(()=>{}),ae(o.workspaceId,o.sessionId).then(E)])).catch(a=>t.set({notice:`${$(n()).pullFailed}: ${a instanceof Error?a.message:String(a)}`}))},dismissNotice:()=>t.set({notice:null}),onCloseTranscript:()=>t.set({transcript:null}),onToggleRail:()=>e.layout?.toggleSidebar?.(),onCreateWorkspace:()=>{t.current.creating!==!0&&t.set({createDialog:{mode:"create"}})},onJoinWorkspace:o=>t.set({createDialog:{mode:"join",workspaceId:o}}),onCloseCreateDialog:o=>{t.set({createDialog:null,creating:!1}),o&&(t.set({notice:$(n()).workspaceCreated}),d())},createWorkspace:(o,l)=>(t.set({creating:!0}),Re(o,l)),joinWorkspace:(o,l)=>(t.set({creating:!0}),Ie(o,l)),createDirectory:je,listDirectory:Le,uiWorkspace:e.uiWorkspace,onViewOptions:o=>{let l=o?.currentTarget?.getBoundingClientRect?.();if(l===void 0)return;let i=$(n());te({anchor:l,items:[{id:"all",label:i.filterAll,run:()=>t.set({viewFilter:"all"})},{id:"mine",label:i.filterMine,run:()=>t.set({viewFilter:"mine"})},{id:"settings",label:i.settingsTitle??i.settings,run:()=>t.set({open:!0})}]})}};e.effect(()=>e.locale.register(gt,{zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A"},en:{title:"Shared Workspace"}}),"nano-shared-workspace: dictionaries"),e.effect(()=>e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"nano-shared-workspace.section",inject:()=>({face:r})},Je)),"nano-shared-workspace: sidebar graft"),window.__nsw={store:t,ctx:e,face:r};let k=new MutationObserver(()=>m());k.observe(document.body,{childList:!0,subtree:!0}),e.effect(()=>()=>k.disconnect()),d()}return ot(xt);})();
		return __nswExport;
	}
});
