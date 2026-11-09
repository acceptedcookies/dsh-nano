window.__ModuleLoader__.load({
	id: "dsh-nano-shared-workspace",
	factory: (require) => {
var __nswExport=(()=>{var Ye=Object.create;var G=Object.defineProperty;var Ge=Object.getOwnPropertyDescriptor;var Xe=Object.getOwnPropertyNames;var Qe=Object.getPrototypeOf,Ze=Object.prototype.hasOwnProperty;var j=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(o,n)=>(typeof require<"u"?require:o)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var et=(e,o)=>{for(var n in o)G(e,n,{get:o[n],enumerable:!0})},he=(e,o,n,t)=>{if(o&&typeof o=="object"||typeof o=="function")for(let l of Xe(o))!Ze.call(e,l)&&l!==n&&G(e,l,{get:()=>o[l],enumerable:!(t=Ge(o,l))||t.enumerable});return e};var P=(e,o,n)=>(n=e!=null?Ye(Qe(e)):{},he(o||!e||!e.__esModule?G(n,"default",{value:e,enumerable:!0}):n,e)),tt=e=>he(G({},"__esModule",{value:!0}),e);var yt={};et(yt,{apply:()=>bt,inject:()=>ht});var Ut=j("react");var H=P(j("react"),1),V=j("@deepseek-ai/dsh-client-ui-primitives");function z({copy:e,title:o,description:n,confirmLabel:t,confirmDisabled:l,busy:m,error:c,danger:x,footer:g,maxHeight:N,width:i,region:C,onConfirm:b,onCancel:r,children:a}){return H.default.createElement(V.Modal,{open:!0,onClose:r,title:o,description:n,closeLabel:e.cancel,className:["nano-dialog-card",N===void 0?"":"nano-dialog-capped",i===void 0?"":"nano-dialog-sized",C===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:g??H.default.createElement(H.default.Fragment,null,H.default.createElement(V.Button,{variant:"outline",className:"nano-modal-action",onClick:r},e.cancel),H.default.createElement(V.Button,{variant:x?"danger":"primary",className:"nano-modal-action",disabled:l===!0||m===!0,onClick:b},t??e.confirm))},a,c===void 0?null:H.default.createElement("p",{className:"nano-dialog-error",role:"alert"},c))}var q=P(j("react"),1),{useCallback:vt,useEffect:we,useRef:ge,useState:nt}=q.default;function be({menu:e,actions:o,onClose:n,width:t=208}){let l=ge(null),[m,c]=nt(0),x=e===null?[]:o,g=x.length,N=ge(x);N.current=x;let i=e===null?null:e.openedAt;if(we(()=>{i!==null&&c(0)},[i]),we(()=>{if(e===null)return;let a=s=>{l.current!==null&&!l.current.contains(s.target)&&n()},p=s=>{if(s.key==="Escape"){s.stopPropagation(),n();return}if(s.key==="ArrowDown"){s.preventDefault(),c(v=>(v+1)%g);return}if(s.key==="ArrowUp"){s.preventDefault(),c(v=>(v-1+g)%g);return}s.key==="Enter"&&(s.preventDefault(),n(),N.current[m]?.run())};return document.addEventListener("pointerdown",a,!0),document.addEventListener("keydown",p,!0),()=>{document.removeEventListener("pointerdown",a,!0),document.removeEventListener("keydown",p,!0)}},[e,m,g,n]),e===null||g===0)return null;let C=g*28+8,b=Math.min(e.x,(window.innerWidth||t)-t-8),r=Math.min(e.y,(window.innerHeight||C)-C-8);return q.default.createElement("div",{className:"nano-menu",role:"menu",ref:l,style:{position:"fixed",left:`${Math.max(8,b)}px`,top:`${Math.max(8,r)}px`,minWidth:`${t}px`},"data-nano-menu":"true"},x.map((a,p)=>q.default.createElement(ot,{key:a.id,item:a,index:p,active:p===m,onHover:c,onRun:n})))}function ot({item:e,index:o,active:n,onHover:t,onRun:l}){return q.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(n),"data-tone":e.tone??"default",onMouseEnter:()=>t(o),onClick:()=>{l(),e.run()}},e.icon===void 0?null:q.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),q.default.createElement("span",{className:"nano-menu-label"},e.label))}var ye=P(j("react"),1),xe=j("react-dom/client");function ee(e){let o=document.createElement("div");o.className="nano-menu-host",document.body.appendChild(o);let n=(0,xe.createRoot)(o),t=()=>{n.unmount(),o.remove()},l=e.anchor,m=l.left!==void 0?l.left:l.x,c=l.bottom!==void 0?l.bottom:(l.y??0)+(l.height??0);return n.render(ye.default.createElement(be,{menu:{x:m,y:c,openedAt:Date.now()},actions:e.items??[],width:e.width,onClose:t})),{close:t}}var I=P(j("react"),1),U=j("react-dom");var ne=P(j("react"),1),E=j("@deepseek-ai/dsh-client-ui-primitives"),{createElement:d,useEffect:rt,useLayoutEffect:ke,useRef:st,useState:X}=ne.default,at=(e,o)=>Object.values(e?.members??{}).find(n=>n?.username===o)?.localPath??"",w=e=>e?.getAttribute?.("class")??"",J=e=>String(e).split(/\s+/).filter(Boolean),M=e=>J(e).filter(o=>!/_wide$/.test(o)).join(" "),B=(e,o)=>{let n=String(e).lastIndexOf("_");return n<0?"":e.slice(0,n+1)+o};function it(){let e=document.querySelector("[data-nano-shared-workspace]"),o=[...document.querySelectorAll("span")].find(u=>!e?.contains(u)&&u.children.length===0&&(u.textContent?.trim()==="\u5DE5\u4F5C\u533A"||u.textContent?.trim()==="Workspace")),n=o?.parentElement,t=n?.parentElement;if(n==null||t==null)return null;let l=[...t.children].find(u=>/listArea/.test(w(u))),m=l?.querySelector('[role="tree"]'),c=[...t.querySelectorAll('[class*="projectRow"]')].find(u=>!String(u.className).includes("menuOpen"));if(l==null||m==null||c==null)return null;let x=n.querySelector('[class*="searchSlot"]'),g=n.querySelector('[class*="headerActions"]'),N=x?.querySelector(":scope > div"),i=N?.querySelector("button")??x?.querySelector("button");if(x==null||g==null||i==null)return null;let C=c.querySelector('[class*="folder"]'),b=c.querySelector('[class*="chevron"]'),r=[...c.children].find(u=>/Text/.test(w(u))),a=r?.querySelector('[class*="title"]'),p=J(w(b?.querySelector("svg"))).find(u=>/arrow/.test(u)&&!/Open/.test(u))??"",s=J(w(c))[0]??"",v=[...t.querySelectorAll('[class*="sessionRow"]')].find(u=>!String(u.className).includes("selected")),h=M(J(w(v)).filter(u=>!/selected/.test(u)).join(" ")),S=[];for(let u of n.children){let L=getComputedStyle(u);if(L.display==="none"||L.position==="absolute"||L.position==="fixed"||w(u)===""&&u.getBoundingClientRect().width===0)continue;let f=u===o?"label":u===x?"search":u===g?"actions":"other";S.push({slot:f,cls:M(w(u))})}return{root:w(t),header:M(w(n)),template:S,search:w(N),searchButton:M(w(i)),actions:M(w(g)),button:M(w(g.querySelector("button"))),listArea:w(l),treeBody:m.parentElement===l?"":M(w(m.parentElement)),list:w(m),group:J(w(c.closest('[class*="groupSection"]'))).filter(u=>!/drop/.test(u)).join(" "),row:J(w(c)).filter(u=>!/menuOpen|drop/.test(u)).join(" "),folder:J(w(C)).filter(u=>!/Active/.test(u)).join(" "),chevron:w(b),projectText:w(r),title:w(a)||B(s,"title"),rowActions:w([...c.children].find(u=>/Actions/.test(w(u)))),arrow:p,arrowOpen:p?B(p,"arrowOpen"):"",sessionRow:h||B(s,"sessionRow"),sessionSlot:w(v?.querySelector('[class*="slot"]'))||B(s,"slot"),sessionTitle:w(v?.querySelector('[class*="title"]'))||B(s,"title"),resting:w(v?.querySelector('[class*="Resting"]'))||B(s,"rowResting"),time:w(v?.querySelector('[class*="time"]'))||B(s,"time")}}function lt(){let[e,o]=X(null);return ke(()=>{let n=0,t=0,l=()=>{let m=it();if(m){o(m);return}++n>40||(t=window.setTimeout(l,50))};return l(),()=>window.clearTimeout(t)},[]),e}function ct({label:e}){return d("div",{className:"nsw-bone-header",role:"status","aria-busy":"true","aria-label":e},d("span",{className:"nsw-bone nsw-bone-label"}))}var te=(e,o,n,t)=>d("button",{type:"button",className:t,title:e,"aria-label":e,...n},o);function ve({face:e,wide:o}){let n=e.copy(),[t,l]=X(e.settings.current),[m,c]=X(!1),[x,g]=X(0),N=st(null),i=lt();ke(()=>e.settings.subscribe(l),[]);let C=t?.listReady===!0,b=C&&t?.sectionOpen===!0;if(rt(()=>{let k=N.current;if(k==null)return;if(!b){g(0);return}let T=k.firstElementChild?.scrollHeight??0;g(T)},[b,m,t?.sharedWorkspaces,t?.sessions,t?.expanded]),!o)return d("div",{className:"nsw-rail",role:"complementary","aria-label":n.railTitle},d("button",{type:"button",className:"nsw-rail-button",title:n.railTitle,"aria-label":n.railTitle,onClick:e.onToggleRail},d(E.IconGlobeOutlineRegular,{size:16})));if(i==null)return d(ct,{label:n.sectionLoading});let r=t?.expandLimit??3,a=t?.configured===!0,p=t?.username,s=t?.viewFilter??"all",v=t?.expanded??{},h=t?.sessions??[],S=(t?.sharedWorkspaces??[]).filter(k=>s!=="mine"||Object.values(k?.members??{}).some(T=>T?.username===p)),u=k=>h.filter(T=>T.workspaceId===k),L=d("div",{className:i.actions},te(n.viewOptions,d(E.IconSlidersTwoOutlineRegular,{size:16}),{"aria-haspopup":"menu","data-nsw-view-options":!0,onClick:e.onViewOptions},i.button),te(n.addWorkspace,d(E.IconProjectAddOutlineRegular,{size:16}),{onClick:e.onCreateWorkspace},i.button)),f=i.template.map((k,T)=>{if(k.slot==="label")return d("span",{key:T,className:`${k.cls} nsw-label-with-expand`},n.title,d("button",{type:"button",className:`${i.button} nsw-expand`,title:b?n.collapseSection:n.expandSection,"aria-label":b?n.collapseSection:n.expandSection,"aria-expanded":b,disabled:!C,onClick:e.onToggleSection},d(E.IconTriangleRightFillRegular,{className:b?`${i.arrow} ${i.arrowOpen}`:i.arrow})));if(k.slot==="search"){let Z=!C||t?.syncing===!0,F=te(n.refresh,d(E.IconRefreshOutlineRegular,{size:14,className:Z?"nsw-spin":void 0}),{onClick:e.onRefresh},i.searchButton);return d("div",{key:T,className:k.cls},i.search?d("div",{className:i.search},F):F)}return k.slot==="actions"?ne.default.cloneElement(L,{key:T,className:k.cls}):d("div",{key:T,className:k.cls})}),$=S.map(k=>{let T=Object.values(k?.members??{}).some(D=>D?.username===p),Z=u(k.workspaceId),F=v[k.workspaceId]===!0,fe=F?Z.map(D=>d("div",{role:"treeitem",key:D.sessionId,className:i.sessionRow,title:D.mtime??"",onClick:()=>e.onOpenSession?.(D)},d("span",{className:i.sessionSlot}),d("span",{className:i.sessionTitle},D.title||D.sessionId),d("span",{className:i.resting},d("span",{className:i.time},D.writerName??"")))):[];return d("div",{key:k.workspaceId,className:i.group},d("div",{role:"treeitem",className:i.row,"aria-expanded":F,title:T?`${n.stateJoined} \xB7 ${at(k,p)}`:n.joinHint,onClick:()=>T?e.onToggleWorkspace?.(k.workspaceId):e.onJoinWorkspace?.(k.workspaceId)},d("span",{className:i.folder},d(F?E.IconFolderOpenRegular:E.IconFolderCloseRegular)),d("span",{className:i.chevron},d(E.IconTriangleRightFillRegular,{className:F?`${i.arrow} ${i.arrowOpen}`:i.arrow})),d("span",{className:i.projectText},d("span",{className:i.title},k?.title??k?.workspaceId)),T?null:d("span",{className:i.time},n.stateIdle),d("span",{className:i.rowActions,onClick:D=>D.stopPropagation()},T?d("button",{type:"button",className:i.button,title:n.newSession,"aria-label":n.newSession,onClick:D=>{D.stopPropagation(),e.onCreateSession?.(k.workspaceId)}},d(E.IconNewChatOutlineRegular,{size:14})):null)),fe.length>0?d("div",{role:"group"},fe):null)}),W=S.length===0?d("div",{className:i.group},d("div",{role:"button",className:i.row,onClick:a?e.onCreateWorkspace:e.onOpenSettings},d("span",{className:i.folder}),d("span",{className:i.chevron}),d("span",{className:i.projectText},d("span",{className:i.title},n.emptyHint)))):null,pe=m?$:$.slice(0,r),ue=$.length-pe.length,Ue=ue>0?d("button",{type:"button",key:"more",className:"nsw-more",onClick:()=>c(!0)},n.showMore.replace("{n}",String(ue))):null,me=d("div",{className:i.list,role:"tree"},pe,Ue,$.length===0?W:null),Ve=i.treeBody?d("div",{className:i.treeBody},me):me;return d("div",{className:`nsw-root ${i.root}`,role:"complementary","aria-label":n.title},d("div",{className:i.header},...f),d("div",{ref:N,className:"nsw-reveal","data-open":b?"true":"false",style:b?{maxHeight:x}:void 0},d("div",{className:"nsw-reveal-inner"},d("div",{className:i.listArea},Ve))))}var $e=P(j("react"),1);var Q=j("@deepseek-ai/dsh-client-ui-primitives");var dt="/nano-shared-workspace";async function R(e,o){let n=await fetch(`${dt}${e}`,{credentials:"same-origin",cache:"no-store",...o}),t=await n.json().catch(()=>({}));if(!n.ok)throw new Error(typeof t?.error=="string"?t.error:`HTTP ${n.status}`);return t}var Se=()=>R("/settings"),Ne=()=>R("/status");function Oe({username:e,token:o,accessKey:n}){return R("/settings/update",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({username:e,token:o,accessKey:n})})}var Ce=()=>R("/workspaces");function Ee(e,o){return R("/workspaces/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:e,localPath:o})})}function Te(e,o){return R("/workspaces/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,localPath:o})})}var oe=()=>R("/sync",{method:"POST"});function Re(e,o){return R("/mkdir",{method:"POST",body:JSON.stringify({parent:e,name:o})}).then(n=>{if(n?.ok!==!0)throw new Error(n?.error??"mkdir failed");return n.path})}var je=e=>R("/ls",{method:"POST",body:JSON.stringify(e===void 0?{}:{path:e})}),Le=()=>R("/sessions");function re(e){return R("/tree/pull",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e})}).then(o=>{if(o?.ok!==!0)throw new Error(o?.error??"pull failed");return o})}function Ie(e,o){return R("/sessions/bind",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({path:e,sessionId:o})}).then(n=>{if(n?.ok!==!0)throw new Error(n?.error??"bind failed");return n})}function se(e,o){return R("/sessions/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:o})}).then(n=>{if(n?.busy===!0)return n;if(n?.ok!==!0)throw new Error(n?.error??"claim failed");return n})}function De(e,o){return R("/sessions/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:o})})}function We(e,o){return R("/materialize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:o})}).then(n=>{if(n?.ok!==!0)throw new Error(n?.error??"materialize failed");return n})}var{createElement:y,useState:Y}=$e.default;function ae({label:e,children:o}){return y("label",{className:"nsw-field"},y("span",{className:"nsw-field-label"},e),o)}function Ae({face:e,settings:o}){let n=e.copy(),[t,l]=Y(o?.username??""),[m,c]=Y(""),[x,g]=Y(""),[N,i]=Y(!1),[C,b]=Y(void 0),r=t.trim(),a=r!==""&&m.trim()!==""&&!N,p=async()=>{if(!a){b(r===""?n.usernameRequired:n.tokenRequired);return}i(!0),b(void 0);try{await Oe({username:r,token:m.trim(),accessKey:x.trim()===""?void 0:x.trim()}),e.settings.close()}catch(s){b(`${n.errorSave}: ${s instanceof Error?s.message:String(s)}`)}finally{i(!1)}};return y(z,{copy:n,title:n.settingsTitle,description:n.settingsDescription,confirmLabel:n.save,confirmDisabled:!a,busy:N,error:C,width:420,onConfirm:p,onCancel:e.settings.close},y("div",{className:"nsw-endpoint"},y("span",{className:"nsw-endpoint-row nsw-identity"},y("span",{className:"nsw-endpoint-key"},n.status),y("span",{className:"nsw-identity-value"},o?.configured===!0?`${n.configured} \xB7 ${o.username??"\u2014"}`:n.unconfigured),o?.configured===!0&&o?.maskedSecret!=null?y("span",{className:"nsw-identity-value","data-masked":"true"},o.maskedSecret):null),y("span",{className:"nsw-endpoint-row"},y("span",{className:"nsw-endpoint-key"},n.endpointLabel),y("code",{className:"nsw-endpoint-value"},o?.endpoint??"\u2014")),y("span",{className:"nsw-endpoint-row"},y("span",{className:"nsw-endpoint-key"},n.bucketLabel),y("code",{className:"nsw-endpoint-value"},o?.bucket??"\u2014"))),y(ae,{label:n.username},y(Q.Input,{value:t,placeholder:n.usernamePlaceholder,"data-modal-autofocus":!0,onChange:s=>l(s.currentTarget.value)})),y(ae,{label:n.token},y(Q.Input,{type:"password",value:m,placeholder:o?.configured===!0?`${n.configured} \xB7 ${o?.maskedSecret??""}`:n.tokenPlaceholder,onChange:s=>c(s.currentTarget.value)})),y(ae,{label:n.accessKeyOptional},y(Q.Input,{value:x,placeholder:n.accessKeyPlaceholder,onChange:s=>g(s.currentTarget.value)})),y("label",{className:"nsw-pref"},y("input",{type:"checkbox",checked:o?.expandOnLoad!==!1,onChange:s=>e.setExpandOnLoad(s.currentTarget.checked)}),y("span",null,y("span",{className:"nsw-field-label"},n.expandOnLoad),y("span",{className:"nsw-join-hint"},n.expandOnLoadHint))),y("p",{className:"nsw-join-hint"},n.joinHint))}var ze=P(j("react"),1);var{createElement:K}=ze.default;function pt(e){let o=e?.data??{};if(e?.type==="user/message")return{role:"user",text:(o.content??[]).filter(t=>t?.type==="text").map(t=>t.text).join(`
`)};if(e?.type==="assistant/message"){let n=(o.message?.content??[]).filter(l=>l?.type==="text").map(l=>l.text).join(`
`);return{role:"assistant",text:[(o.message?.content??[]).filter(l=>l?.type==="reasoning").map(l=>l.text).join(`
`),n].filter(Boolean).join(`

`)}}return e?.type==="tool/call"?{role:"tool",text:`${o.name??o.tool??"tool"} ${JSON.stringify(o.input??o.args??{}).slice(0,160)}`}:null}function Pe({face:e,transcript:o}){let n=e.copy(),t=o?.events??[],l=t.map(pt).filter(m=>m!==null&&m.text.trim()!=="");return K(z,{copy:n,title:o?.meta?.title??n.transcriptFallback,confirmLabel:n.closeLabel??"Close",onConfirm:e.onCloseTranscript,onCancel:e.onCloseTranscript},K("div",{className:"nsw-transcript-meta"},`${o?.meta?.writerName??"?"} \xB7 ${o?.meta?.mtime??""} \xB7 ${t.length} events \xB7 ${o?.meta?.committedBytes??0}B`),K("div",{className:"nsw-transcript-body"},l.length===0?K("p",{className:"nsw-notice"},n.transcriptEmpty):l.map((m,c)=>K("div",{key:c,className:`nsw-transcript-row nsw-role-${m.role}`},K("span",{className:"nsw-transcript-role"},n[`role_${m.role}`]??m.role),K("span",{className:"nsw-transcript-text"},m.text)))))}var ie=P(j("react"),1);var{createElement:O,useEffect:ut,useRef:mt,useState:_}=ie.default;function Fe({face:e,mode:o,workspaceId:n}){let t=e.copy(),[l,m]=_(""),[c,x]=_(null),[g,N]=_(null),[i,C]=_(!1),[b,r]=_(""),[a,p]=_(!1),[s,v]=_(null),h=mt(0),S=f=>{let $=++h.current;p(!0),e.listDirectory(f).then(W=>{h.current===$&&x(W)}).catch(W=>v(W instanceof Error?W.message:String(W))).finally(()=>{h.current===$&&p(!1)})};ut(()=>{S(void 0)},[]);let u=f=>{p(!0),(o==="join"?e.joinWorkspace(n,f):e.createWorkspace(l.trim(),f)).then(()=>e.onCloseCreateDialog?.(!0)).catch(W=>v(`${t.createFailed}: ${W instanceof Error?W.message:String(W)}`)).finally(()=>p(!1))},L=o==="join"||l.trim()!=="";return O(z,{copy:t,title:o==="join"?t.pickReplicaTitle:t.createTitle,confirmLabel:o==="join"?t.joinHere:t.createHere,confirmDisabled:!L||a||c===null,busy:a,onConfirm:()=>u(g??c?.path),onCancel:()=>e.onCloseCreateDialog?.(!1)},O("div",{className:"nsw-create-body"},o==="create"?O("label",{className:"nsw-field"},O("span",{className:"nsw-field-label"},t.workspaceName),O("input",{className:"nsw-input",value:l,onChange:f=>m(f.target.value),placeholder:t.workspaceNameHint})):null,O("p",{className:"nsw-field-label"},t.pickReplicaHint),O("div",{className:"nsw-crumbs"},(c?.crumbs??[]).map((f,$)=>O(ie.default.Fragment,{key:f.path},$>0?O("span",{className:"nsw-crumb-sep"},"/"):null,O("button",{type:"button",className:"nsw-crumb",onClick:()=>S(f.path)},f.name===""?"/":f.name)))),O("div",{className:"nsw-entries"},a&&c===null?O("p",{className:"nsw-notice"},t.loading):null,(c?.entries??[]).filter(f=>!f.hidden).map(f=>O("button",{type:"button",key:f.path,className:`nsw-entry${g===f.path?" nsw-entry-selected":""}`,onClick:()=>N(f.path),onDoubleClick:()=>S(f.path)},f.name)),c!==null&&(c.entries??[]).filter(f=>!f.hidden).length===0?O("p",{className:"nsw-notice"},t.emptyDir):null),i?O("div",{className:"nsw-new-folder"},O("input",{className:"nsw-input",value:b,onChange:f=>r(f.target.value),placeholder:t.newFolder}),O("button",{type:"button",className:"nsw-button",disabled:b.trim()===""||a,onClick:()=>{p(!0),e.createDirectory(c.path,b.trim()).then(f=>{C(!1),r(""),N(f),S(c.path)}).catch(f=>v(f instanceof Error?f.message:String(f))).finally(()=>p(!1))}},t.createFolder)):O("button",{type:"button",className:"nsw-link-button",onClick:()=>C(!0)},`\uFF0B ${t.newFolder}`),s!==null?O("p",{className:"nsw-notice"},s):null))}var He="data-nano-shared-workspace";function ft(){return document.querySelector('[role="tree"]')}function qe(){let e=ft();for(;e!==null&&e!==document.body;){let o=e.parentElement;if(o!==null&&o.querySelector(":scope > nav")!==null)return e;e=o}for(let o of document.querySelectorAll("nav")){if(o.parentElement===null)continue;let t=o.nextElementSibling;if(t!==null&&t.tagName==="DIV"&&t.querySelector("nav")===null)return t}return null}function le(){let e=qe();return e===null?!0:e.getBoundingClientRect().width>80}function ce(){let e=qe();if(e===null)return null;let o=e.querySelector(`[${He}]`);return o===null?(o=document.createElement("div"),o.setAttribute(He,""),o.className="nsw-graft",e.prepend(o)):o!==e.firstElementChild&&e.prepend(o),o}function Me({face:e,renderSlot:o}){let[n,t]=I.default.useState(()=>ce()),[l,m]=I.default.useState(()=>le()),[c,x]=I.default.useState(e.settings.current);return I.default.useEffect(()=>e.settings.subscribe(x),[]),I.default.useEffect(()=>{let g=new MutationObserver(()=>{t(ce()),m(le())});return g.observe(document.body,{childList:!0,subtree:!0,attributes:!0}),t(ce()),m(le()),()=>{g.disconnect(),n?.remove()}},[]),n===null?null:I.default.createElement(I.default.Fragment,null,(0,U.createPortal)(I.default.createElement(ve,{face:e,wide:l}),n),c?.open===!0?(0,U.createPortal)(I.default.createElement(Ae,{face:e,settings:c}),document.body):null,c?.transcript!=null?(0,U.createPortal)(I.default.createElement(Pe,{face:e,transcript:c.transcript}),document.body):null,typeof c?.notice=="string"&&c.notice!==""?(0,U.createPortal)(I.default.createElement(z,{copy:e.copy(),title:e.copy().noticeTitle,confirmLabel:e.copy().closeLabel,onConfirm:e.dismissNotice,onCancel:e.dismissNotice},c.notice),document.body):null,c?.createDialog!=null?(0,U.createPortal)(I.default.createElement(Fe,{face:e,mode:c.createDialog.mode,workspaceId:c.createDialog.workspaceId}),document.body):null)}var Be={zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A",railTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A",settings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",viewOptions:"\u89C6\u56FE\u9009\u9879",addWorkspace:"\u6DFB\u52A0\u5171\u4EAB\u5DE5\u4F5C\u533A",filterAll:"\u5168\u90E8\u5171\u4EAB\u5DE5\u4F5C\u533A",filterMine:"\u53EA\u770B\u6211\u52A0\u5165\u7684",workspaceCreated:"\u5DF2\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",createFailed:"\u521B\u5EFA\u5DE5\u4F5C\u533A\u5931\u8D25",enterFailed:"\u65E0\u6CD5\u8FDB\u5165\u8FD9\u4E2A\u5171\u4EAB\u5DE5\u4F5C\u533A",pullFailed:"\u65E0\u6CD5\u4ECE\u5171\u4EAB\u7A7A\u95F4\u8F7D\u5165\u8FD9\u4E2A\u4F1A\u8BDD",noticeTitle:"\u65E0\u6CD5\u6253\u5F00",workspaceAddLocal:"\u6DFB\u52A0\u5DE5\u4F5C\u533A",creating:"\u6B63\u5728\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A\u2026",syncPushed:"\u5DF2\u63A8\u9001",transcriptFallback:"\u8FDC\u7A0B\u4F1A\u8BDD",transcriptEmpty:"\u8BE5\u4F1A\u8BDD\u6682\u65E0\u53EF\u8BFB\u5185\u5BB9",transcriptFailed:"\u8BFB\u53D6\u4F1A\u8BDD\u5931\u8D25",role_user:"\u7528\u6237",role_assistant:"\u52A9\u624B",role_tool:"\u5DE5\u5177",createTitle:"\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",pickReplicaTitle:"\u52A0\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",workspaceName:"\u5DE5\u4F5C\u533A\u540D\u79F0",workspaceNameHint:"\u4F8B\u5982 team-portal",pickReplicaHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u5B58\u653E\u4F4D\u7F6E\uFF08\u4E91\u7AEF\u624D\u662F\u771F\u6E90\uFF09",loading:"\u52A0\u8F7D\u76EE\u5F55\u2026",emptyDir:"\u8BE5\u76EE\u5F55\u4E3A\u7A7A",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",createFolder:"\u521B\u5EFA",createHere:"\u521B\u5EFA\u5230\u6B64\u76EE\u5F55",joinHere:"\u52A0\u5165\u5230\u6B64\u76EE\u5F55",joinHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u4F4D\u7F6E\u4EE5\u52A0\u5165",readOnlyBusy:"\u53EA\u8BFB\uFF1A{holder} \u6B63\u5728\u5199\u8FD9\u6761\u4F1A\u8BDD\uFF0C\u79DF\u7EA6\u7ED3\u675F\u524D\u4E0D\u80FD\u5360\u7528",closeLabel:"\u5173\u95ED",settingsTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A\u8BBE\u7F6E",settingsDescription:"\u8EAB\u4EFD\u5199\u5165\u51ED\u636E\u5B58\u50A8\uFF1BS3 \u771F\u6E90\u7AEF\u70B9\u5728\u670D\u52A1\u7AEF\u914D\u7F6E\u4E2D\u56FA\u5B9A\u3002",username:"\u7528\u6237\u540D",usernamePlaceholder:"\u5728\u5171\u4EAB\u7A7A\u95F4\u663E\u793A\u7684\u540D\u5B57",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key \u6216\u670D\u52A1\u7AEF\u4EE4\u724C",accessKeyOptional:"\u8BBF\u95EE\u5BC6\u94A5\uFF08\u53EF\u9009\uFF09",accessKeyPlaceholder:"\u72EC\u7ACB access key \u65F6\u586B\u5199",endpointLabel:"\u7AEF\u70B9",bucketLabel:"\u5B58\u50A8\u6876",status:"\u72B6\u6001",configured:"\u5DF2\u914D\u7F6E",unconfigured:"\u672A\u914D\u7F6E",emptyHint:"\u8BF7\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",sectionLoading:"\u6B63\u5728\u8F7D\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",newSession:"\u65B0\u5EFA\u4F1A\u8BDD",expandSection:"\u5C55\u5F00\u5171\u4EAB\u5DE5\u4F5C\u533A",collapseSection:"\u6536\u8D77\u5171\u4EAB\u5DE5\u4F5C\u533A",showMore:"\u5C55\u5F00\u5176\u4F59 {n} \u4E2A",expandOnLoad:"\u52A0\u8F7D\u5B8C\u6210\u540E\u5C55\u5F00\u5DE5\u4F5C\u533A",expandOnLoadHint:"\u9ED8\u8BA4\u5C55\u5F00\u524D 3 \u4E2A\uFF0C\u5176\u4F59\u6536\u8D77\uFF0C\u53EF\u518D\u624B\u52A8\u5C55\u5F00\u3002",stateJoined:"\u5DF2\u52A0\u5165",stateIdle:"\u672A\u52A0\u5165",usernameRequired:"\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A",tokenRequired:"MinIO Token \u4E0D\u80FD\u4E3A\u7A7A",saved:"\u5DF2\u4FDD\u5B58",clear:"\u6E05\u9664",clearTitle:"\u6E05\u9664\u5171\u4EAB\u51ED\u636E",clearBody:"\u5220\u9664\u672C\u673A\u4FDD\u5B58\u7684\u7528\u6237\u540D\u548C MinIO Token\uFF0C\u5E76\u65AD\u5F00\u5171\u4EAB\u7A7A\u95F4\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",cancel:"\u53D6\u6D88",confirm:"\u4FDD\u5B58",close:"\u5173\u95ED",save:"\u4FDD\u5B58",joinHint:"\u591A\u53F0\u5BA2\u6237\u7AEF\u4F7F\u7528\u540C\u4E00\u7528\u6237\u540D + Token \u5373\u89C6\u4E3A\u540C\u4E00\u8EAB\u4EFD\u3002",errorLoad:"\u8BFB\u53D6\u8BBE\u7F6E\u5931\u8D25",errorSave:"\u4FDD\u5B58\u5931\u8D25"},en:{title:"Shared Workspace",railTitle:"Shared Workspace",settings:"Settings",refresh:"Refresh",viewOptions:"View options",addWorkspace:"Add shared workspace",filterAll:"All shared workspaces",filterMine:"Only ones I joined",workspaceCreated:"Shared workspace created",createFailed:"Failed to create workspace",enterFailed:"Could not open this shared workspace",pullFailed:"Could not load this session from the shared space",noticeTitle:"Could not open",workspaceAddLocal:"Add workspace",creating:"Creating shared workspace\u2026",syncPushed:"Pushed",transcriptFallback:"Remote session",transcriptEmpty:"Nothing readable in this session yet",transcriptFailed:"Failed to read session",role_user:"User",role_assistant:"Assistant",role_tool:"Tool",createTitle:"New shared workspace",pickReplicaTitle:"Join shared workspace",workspaceName:"Workspace name",workspaceNameHint:"e.g. team-portal",pickReplicaHint:"Pick the local replica location (the cloud is canonical)",loading:"Loading directory\u2026",emptyDir:"This directory is empty",newFolder:"New folder",createFolder:"Create",createHere:"Create here",joinHere:"Join here",joinHint:"Pick a local replica location to join",readOnlyBusy:"Read-only: {holder} holds this session until the lease expires",closeLabel:"Close",settingsTitle:"Shared Workspace Settings",settingsDescription:"Identity is stored in the credential store; the S3 source of truth is fixed in server config.",username:"Username",usernamePlaceholder:"Name shown in the shared space",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key or server token",accessKeyOptional:"Access Key (optional)",accessKeyPlaceholder:"Only for a separate access key",endpointLabel:"Endpoint",bucketLabel:"Bucket",status:"Status",configured:"Configured",unconfigured:"Not configured",emptyHint:"Create a shared workspace",sectionLoading:"Loading shared workspaces",newSession:"New session",expandSection:"Expand shared workspaces",collapseSection:"Collapse shared workspaces",showMore:"Show {n} more",expandOnLoad:"Expand after loading",expandOnLoadHint:"Shows the first 3, and keeps the rest collapsed until you ask.",stateJoined:"Joined",stateIdle:"Not joined",usernameRequired:"Username is required",tokenRequired:"MinIO token is required",saved:"Saved",clear:"Clear",clearTitle:"Clear shared credentials",clearBody:"Remove the locally stored username and MinIO token and leave the shared space. This cannot be undone.",cancel:"Cancel",confirm:"Save",close:"Close",save:"Save",joinHint:"Clients sharing the same username + token count as one identity.",errorLoad:"Failed to load settings",errorSave:"Failed to save"}},A=e=>Be[e==="zh"?"zh":"en"]??Be.en;var Je=`
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
`;var ht=["slots","locale","layout","uiWorkspace","workspaces","sessions"],wt="nanoSharedWorkspace",Ke="nsw-section-prefs",de=3;function _e(){try{return{expandOnLoad:JSON.parse(localStorage.getItem(Ke)||"")?.expandOnLoad!==!1,expandLimit:de}}catch{return{expandOnLoad:!0,expandLimit:de}}}function gt(){let e={open:!1,loaded:!1,configured:!1,username:null,..._e()},o=new Set,n=()=>{for(let t of o)t()};return{get current(){return e},set(t){e={...e,...t},n()},subscribe:t=>(o.add(t),()=>o.delete(t))}}function bt(e){let o=document.createElement("style");o.dataset.nswStyle="true",o.textContent=Je,document.head.append(o),e.effect(()=>()=>o.remove());let n=()=>e.locale.getSnapshot().active,t=gt(),l=(r,a)=>Object.values(r?.members??{}).find(p=>p?.username===a)?.localPath??"",m=()=>{let r=document.querySelector("[data-nano-shared-workspace]"),a=t.current.username,p=new Set;for(let h of t.current.sharedWorkspaces??[]){let S=l(h,a);S&&p.add(S.replace(/\/+$/,""))}let s=new Set([...(t.current.sessions??[]).map(h=>h.sessionId),...t.current.ownedSessionIds??[]]),v=new Set((e.workspaces.list.getSnapshot().items??[]).filter(h=>p.has(h.path?.replace(/\/+$/,""))).map(h=>h.workspaceId));for(let h of document.querySelectorAll('[data-row-key^="workspace:"]')){if(r?.contains(h))continue;let S=h.getAttribute("data-row-key").slice(10),u=h.closest('[class*="groupSection"]')??h,L=v.has(S);u.hidden!==L&&(u.hidden=L)}for(let h of document.querySelectorAll('[data-row-key^="session:"]')){if(r?.contains(h))continue;let S=h.getAttribute("data-row-key").slice(8),u=s.has(S);h.hidden!==u&&(h.hidden=u)}for(let h of document.querySelectorAll('[data-row-key="workspace:"]')){if(r?.contains(h))continue;let S=h.closest('[class*="groupSection"]')??h.parentElement;if(S==null)continue;let u=[...S.querySelectorAll('[data-row-key^="session:"]')],L=u.length>0&&u.every(f=>f.hidden);S.hidden!==L&&(S.hidden=L)}},c=()=>{Se().then(r=>(t.set({...r,loaded:!0}),Ce().then(a=>{let p=a.workspaces??[],s=t.current.listReady!==!0;t.set({sharedWorkspaces:p,listReady:!0,...s?{sectionOpen:_e().expandOnLoad}:{}}),m()}).catch(()=>t.set({listReady:!0,...t.current.listReady!==!0?{sectionOpen:!1}:{}})))).catch(()=>t.set({loaded:!0,listReady:!0})),Ne().catch(()=>{}),Le().then(r=>{t.set({sessions:r.sessions??[]}),m()}).catch(()=>{})},x=0,g=(r,a)=>{window.clearInterval(x),x=window.setInterval(()=>{De(r,a).catch(()=>window.clearInterval(x))},25e3)},N=async r=>{let a=r.replace(/\/+$/,""),p=e.workspaces.list.getSnapshot().items?.find(s=>s.path?.replace(/\/+$/,"")===a);return p||e.workspaces.create({path:r})},i=async(r,a)=>{let p=a!=null&&e.sessions.list.getSnapshot().byId?.[a]!=null;a!=null&&!p&&(await We(r,a),await e.sessions.refresh())},C={copy:()=>A(n()),settings:{get current(){return t.current},get open(){return t.current.open===!0},subscribe:r=>t.subscribe(()=>r(t.current)),close:()=>t.set({open:!1})},onOpenSettings:()=>{c(),t.set({open:!0})},onToggleSection:()=>{t.current.listReady===!0&&t.set({sectionOpen:t.current.sectionOpen!==!0})},setExpandOnLoad:r=>{let a={expandOnLoad:r===!0,expandLimit:de};localStorage.setItem(Ke,JSON.stringify(a)),t.set(a)},onRefresh:()=>{t.set({syncing:!0}),oe().then(r=>{r.pushed>0&&t.set({notice:`${A(n()).syncPushed} ${r.pushed}`})}).catch(()=>{}).finally(()=>{t.set({syncing:!1}),c()})},onToggleWorkspace:r=>{let a=t.current.expanded?.[r]===!0;t.set({expanded:{...t.current.expanded??{},[r]:!a}})},onCreateSession:r=>{let a=(t.current.sharedWorkspaces??[]).find(s=>s.workspaceId===r),p=l(a,t.current.username);if(p===""){t.set({notice:A(n()).joinHint});return}t.set({notice:null,sectionOpen:!0,expanded:{...t.current.expanded??{},[r]:!0}}),re(r).then(()=>N(p)).then(s=>e.sessions.create({workspaceId:s.workspaceId})).then(s=>se(r,s).then(v=>{if(v?.busy===!0)throw new Error(A(n()).readOnlyBusy.replace("{holder}",v.holder??""));return g(r,s),s})).then(s=>{let v={workspaceId:r,sessionId:s,title:"",writerName:t.current.username??"",cwd:p};t.set({ownedSessionIds:[...t.current.ownedSessionIds??[],s],sessions:[v,...(t.current.sessions??[]).filter(h=>h.sessionId!==s)]}),m(),e.uiWorkspace.openSession(s),oe().finally(()=>c())}).catch(s=>t.set({notice:`${A(n()).enterFailed}: ${s instanceof Error?s.message:String(s)}`}))},onOpenSession:r=>{t.set({notice:null,sectionOpen:!0,expanded:{...t.current.expanded??{},[r.workspaceId]:!0}}),re(r.workspaceId).then(()=>se(r.workspaceId,r.sessionId)).then(a=>a?.busy===!0?(t.set({notice:A(n()).readOnlyBusy.replace("{holder}",a.holder??"")}),"busy"):(g(r.workspaceId,r.sessionId),i(r.workspaceId,r.sessionId))).then(async a=>{if(a==="busy")return"busy";let p=l((t.current.sharedWorkspaces??[]).find(s=>s.workspaceId===r.workspaceId),t.current.username);if(p!==""){let s=await N(p);e.workspaces.list.getSnapshot().items?.find(h=>h.workspaceId===s.workspaceId)?.sessionIds?.includes(r.sessionId)===!0||await Ie(p,r.sessionId)}}).then(a=>{a!=="busy"&&(t.set({ownedSessionIds:[...t.current.ownedSessionIds??[],r.sessionId]}),m(),e.uiWorkspace.openSession(r.sessionId))}).catch(a=>t.set({notice:`${A(n()).pullFailed}: ${a instanceof Error?a.message:String(a)}`}))},dismissNotice:()=>t.set({notice:null}),onCloseTranscript:()=>t.set({transcript:null}),onToggleRail:()=>e.layout?.toggleSidebar?.(),onCreateWorkspace:()=>{t.current.creating!==!0&&t.set({createDialog:{mode:"create"}})},onJoinWorkspace:r=>t.set({createDialog:{mode:"join",workspaceId:r}}),onCloseCreateDialog:r=>{t.set({createDialog:null,creating:!1}),r&&(t.set({notice:A(n()).workspaceCreated}),c())},createWorkspace:(r,a)=>(t.set({creating:!0}),Ee(r,a)),joinWorkspace:(r,a)=>(t.set({creating:!0}),Te(r,a)),createDirectory:Re,listDirectory:je,uiWorkspace:e.uiWorkspace,onViewOptions:r=>{let a=r?.currentTarget?.getBoundingClientRect?.();if(a===void 0)return;let p=A(n());ee({anchor:a,items:[{id:"all",label:p.filterAll,run:()=>t.set({viewFilter:"all"})},{id:"mine",label:p.filterMine,run:()=>t.set({viewFilter:"mine"})},{id:"settings",label:p.settingsTitle??p.settings,run:()=>t.set({open:!0})}]})}};e.effect(()=>e.locale.register(wt,{zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A"},en:{title:"Shared Workspace"}}),"nano-shared-workspace: dictionaries"),e.effect(()=>e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"nano-shared-workspace.section",inject:()=>({face:C})},Me)),"nano-shared-workspace: sidebar graft"),window.__nsw={store:t,ctx:e,face:C};let b=new MutationObserver(()=>m());b.observe(document.body,{childList:!0,subtree:!0}),e.effect(()=>()=>b.disconnect()),c()}return tt(yt);})();
		return __nswExport;
	}
});
