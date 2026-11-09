window.__ModuleLoader__.load({
	id: "dsh-nano-shared-workspace",
	factory: (require) => {
var __nswExport=(()=>{var an=Object.create;var te=Object.defineProperty;var ln=Object.getOwnPropertyDescriptor;var cn=Object.getOwnPropertyNames;var dn=Object.getPrototypeOf,pn=Object.prototype.hasOwnProperty;var L=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(s,t)=>(typeof require<"u"?require:s)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var un=(e,s)=>{for(var t in s)te(e,t,{get:s[t],enumerable:!0})},ve=(e,s,t,n)=>{if(s&&typeof s=="object"||typeof s=="function")for(let d of cn(s))!pn.call(e,d)&&d!==t&&te(e,d,{get:()=>s[d],enumerable:!(n=ln(s,d))||n.enumerable});return e};var H=(e,s,t)=>(t=e!=null?an(dn(e)):{},ve(s||!e||!e.__esModule?te(t,"default",{value:e,enumerable:!0}):t,e)),mn=e=>ve(te({},"__esModule",{value:!0}),e);var En={};un(En,{apply:()=>Tn,inject:()=>In});var ot=L("react");var K=H(L("react"),1),X=L("@deepseek-ai/dsh-client-ui-primitives");function z({copy:e,title:s,description:t,confirmLabel:n,confirmDisabled:d,busy:h,error:c,danger:y,footer:w,maxHeight:O,width:S,region:E,onConfirm:a,onCancel:I,children:g}){return K.default.createElement(X.Modal,{open:!0,onClose:I,title:s,description:t,closeLabel:e.cancel,className:["nano-dialog-card",O===void 0?"":"nano-dialog-capped",S===void 0?"":"nano-dialog-sized",E===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:w??K.default.createElement(K.default.Fragment,null,K.default.createElement(X.Button,{variant:"outline",className:"nano-modal-action",onClick:I},e.cancel),K.default.createElement(X.Button,{variant:y?"danger":"primary",className:"nano-modal-action",disabled:d===!0||h===!0,onClick:a},n??e.confirm))},g,c===void 0?null:K.default.createElement("p",{className:"nano-dialog-error",role:"alert"},c))}var _=H(L("react"),1),{useCallback:Pn,useEffect:Se,useRef:Ne,useState:hn}=_.default;function Oe({menu:e,actions:s,onClose:t,width:n=208}){let d=Ne(null),[h,c]=hn(0),y=e===null?[]:s,w=y.length,O=Ne(y);O.current=y;let S=e===null?null:e.openedAt;if(Se(()=>{S!==null&&c(0)},[S]),Se(()=>{if(e===null)return;let g=r=>{d.current!==null&&!d.current.contains(r.target)&&t()},o=r=>{if(r.key==="Escape"){r.stopPropagation(),t();return}if(r.key==="ArrowDown"){r.preventDefault(),c(p=>(p+1)%w);return}if(r.key==="ArrowUp"){r.preventDefault(),c(p=>(p-1+w)%w);return}r.key==="Enter"&&(r.preventDefault(),t(),O.current[h]?.run())};return document.addEventListener("pointerdown",g,!0),document.addEventListener("keydown",o,!0),()=>{document.removeEventListener("pointerdown",g,!0),document.removeEventListener("keydown",o,!0)}},[e,h,w,t]),e===null||w===0)return null;let E=w*28+8,a=Math.min(e.x,(window.innerWidth||n)-n-8),I=Math.min(e.y,(window.innerHeight||E)-E-8);return _.default.createElement("div",{className:"nano-menu",role:"menu",ref:d,style:{position:"fixed",left:`${Math.max(8,a)}px`,top:`${Math.max(8,I)}px`,minWidth:`${n}px`},"data-nano-menu":"true"},y.map((g,o)=>_.default.createElement(fn,{key:g.id,item:g,index:o,active:o===h,onHover:c,onRun:t})))}function fn({item:e,index:s,active:t,onHover:n,onRun:d}){return _.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>n(s),onClick:()=>{d(),e.run()}},e.icon===void 0?null:_.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),_.default.createElement("span",{className:"nano-menu-label"},e.label))}var Ie=H(L("react"),1),Ce=L("react-dom/client");function ie(e){let s=document.createElement("div");s.className="nano-menu-host",document.body.appendChild(s);let t=(0,Ce.createRoot)(s),n=()=>{t.unmount(),s.remove()},d=e.anchor,h=d.left!==void 0?d.left:d.x,c=d.bottom!==void 0?d.bottom:(d.y??0)+(d.height??0);return t.render(Ie.default.createElement(Oe,{menu:{x:h,y:c,openedAt:Date.now()},actions:e.items??[],width:e.width,onClose:n})),{close:n}}var T=H(L("react"),1),Y=L("react-dom");var Ye=L("@deepseek-ai/dsh-client-ui-primitives");var se=H(L("react"),1),k=L("@deepseek-ai/dsh-client-ui-primitives"),{createElement:l,useEffect:Re,useLayoutEffect:Te,useRef:wn,useState:Q}=se.default;var b=e=>e?.getAttribute?.("class")??"",F=e=>String(e).split(/\s+/).filter(Boolean),q=e=>F(e).filter(s=>!/_wide$/.test(s)).join(" "),$=(e,s)=>{let t=String(e).lastIndexOf("_");return t<0?"":e.slice(0,t+1)+s};function gn(){let e=document.querySelector("[data-nano-shared-workspace]"),s=[...document.querySelectorAll("span")].find(i=>!e?.contains(i)&&i.children.length===0&&(i.textContent?.trim()==="\u5DE5\u4F5C\u533A"||i.textContent?.trim()==="Workspace")),t=s?.parentElement,n=t?.parentElement;if(t==null||n==null)return null;let d=[...n.children].find(i=>/listArea/.test(b(i))),h=d?.querySelector('[role="tree"]'),c=[...n.querySelectorAll('[class*="projectRow"]')].find(i=>!String(i.className).includes("menuOpen"));if(d==null||h==null||c==null)return null;let y=t.querySelector('[class*="searchSlot"]'),w=t.querySelector('[class*="headerActions"]'),O=y?.querySelector(":scope > div"),S=O?.querySelector("button")??y?.querySelector("button");if(y==null||w==null||S==null)return null;let E=c.querySelector('[class*="folder"]'),a=c.querySelector('[class*="chevron"]'),I=[...c.children].find(i=>/Text/.test(b(i))),g=I?.querySelector('[class*="title"]'),o=F(b(a?.querySelector("svg"))).find(i=>/arrow/.test(i)&&!/Open/.test(i))??"",r=F(b(c))[0]??"",p=[...n.querySelectorAll('[class*="sessionRow"]')].find(i=>!String(i.className).includes("selected")),u=q(F(b(p)).filter(i=>!/selected/.test(i)).join(" ")),N=[];for(let i of t.children){let f=getComputedStyle(i);if(f.display==="none"||f.position==="absolute"||f.position==="fixed"||b(i)===""&&i.getBoundingClientRect().width===0)continue;let m=i===s?"label":i===y?"search":i===w?"actions":"other";N.push({slot:m,cls:q(b(i))})}return{root:b(n),header:q(b(t)),template:N,search:b(O),searchButton:q(b(S)),actions:q(b(w)),button:q(b(w.querySelector("button"))),listArea:b(d),treeBody:h.parentElement===d?"":q(b(h.parentElement)),list:b(h),group:F(b(c.closest('[class*="groupSection"]'))).filter(i=>!/drop/.test(i)).join(" "),row:F(b(c)).filter(i=>!/menuOpen|drop/.test(i)).join(" "),folder:F(b(E)).filter(i=>!/Active/.test(i)).join(" "),chevron:b(a),projectText:b(I),title:b(g)||$(r,"title"),rowActions:b([...c.children].find(i=>/Actions/.test(b(i)))),rowButton:q(b(c.querySelector('[class*="rowActions"] button'))),arrow:o,arrowOpen:o?$(o,"arrowOpen"):"",sessionRow:u||$(r,"sessionRow"),selected:$(F(u).find(i=>/sessionRow/.test(i))||$(r,"sessionRow"),"selected"),archived:$(F(u).find(i=>/sessionRow/.test(i))||$(r,"sessionRow"),"archived"),sessionSlot:b(p?.querySelector('[class*="slot"]'))||$(r,"slot"),sessionTitle:b(p?.querySelector('[class*="title"]'))||$(r,"title"),resting:b(p?.querySelector('[class*="Resting"]'))||$(r,"rowResting"),time:b(p?.querySelector('[class*="time"]'))||$(r,"time")}}function bn(){let[e,s]=Q(null);return Te(()=>{let t=0,n=0,d=()=>{let h=gn();if(h){s(h);return}++t>40||(n=window.setTimeout(d,50))};return d(),()=>window.clearTimeout(n)},[]),e}function yn({label:e}){return l("div",{className:"nsw-bone-header",role:"status","aria-busy":"true","aria-label":e},l("span",{className:"nsw-bone nsw-bone-label"}))}var le=(e,s,t,n)=>l("button",{type:"button",className:n,title:e,"aria-label":e,...t},s);function Ee({face:e,wide:s}){let t=e.copy(),[n,d]=Q(e.settings.current),[h,c]=Q(()=>e.currentSessionId?.()??null),[y,w]=Q(!1),[O,S]=Q(0),E=wn(null),a=bn();Te(()=>e.settings.subscribe(d),[]),Re(()=>e.subscribeSession?.(c),[]);let I=n?.listReady===!0,g=I&&n?.sectionOpen===!0;if(Re(()=>{let x=E.current;if(x==null)return;if(!g){S(0);return}let D=x.firstElementChild?.scrollHeight??0;S(D)},[g,y,n?.sharedWorkspaces,n?.sessions,n?.expanded]),!s)return l("div",{className:"nsw-rail",role:"complementary","aria-label":t.railTitle},l("button",{type:"button",className:"nsw-rail-button",title:t.railTitle,"aria-label":t.railTitle,onClick:e.onToggleRail},l(k.IconGlobeOutlineRegular,{size:16})));if(a==null)return l(yn,{label:t.sectionLoading});let o=n?.expandLimit??3,r=n?.configured===!0,p=n?.username,u=n?.viewFilter??"all",N=n?.expanded??{},i=n?.sessions??[],f=(n?.sharedWorkspaces??[]).filter(x=>u!=="mine"||Object.values(x?.members??{}).some(D=>D?.username===p)),m=x=>i.filter(D=>D.workspaceId===x),A=l("div",{className:a.actions},le(t.viewOptions,l(k.IconSlidersTwoOutlineRegular,{size:16}),{"aria-haspopup":"menu","data-nsw-view-options":!0,onClick:e.onViewOptions},a.button),le(t.addWorkspace,l(k.IconProjectAddOutlineRegular,{size:16}),{onClick:e.onCreateWorkspace},a.button)),j=a.template.map((x,D)=>{if(x.slot==="label")return l("span",{key:D,className:`${x.cls} nsw-label-with-expand`},t.title,l("button",{type:"button",className:`${a.button} nsw-expand`,title:g?t.collapseSection:t.expandSection,"aria-label":g?t.collapseSection:t.expandSection,"aria-expanded":g,disabled:!I,onClick:e.onToggleSection},l(k.IconTriangleRightFillRegular,{className:g?`${a.arrow} ${a.arrowOpen}`:a.arrow})));if(x.slot==="search"){let ae=!I||n?.syncing===!0,M=le(t.refresh,l(k.IconRefreshOutlineRegular,{size:14,className:ae?"nsw-spin":void 0}),{onClick:e.onRefresh},a.searchButton);return l("div",{key:D,className:x.cls},a.search?l("div",{className:a.search},M):M)}return x.slot==="actions"?se.default.cloneElement(A,{key:D,className:x.cls}):l("div",{key:D,className:x.cls})}),ee=f.map(x=>{let D=Object.values(x?.members??{}).some(C=>C?.username===p),ae=m(x.workspaceId),M=N[x.workspaceId]===!0,ye=new Set(n?.pinnedSessionIds??[]),xe=new Set(n?.archivedSessionIds??[]),rn=[...ae].sort((C,G)=>{let B=ne=>xe.has(ne.sessionId)?2:ye.has(ne.sessionId)?0:1;return B(C)-B(G)}),ke=M?rn.map(C=>{let G=ye.has(C.sessionId),B=xe.has(C.sessionId),ne=n?.sessionsReady!==!0||n?.pulling?.[x.workspaceId]===!0;return l("div",{role:"treeitem",key:C.sessionId,className:[a.sessionRow,C.sessionId===h&&a.selected?a.selected:"",B&&a.archived?a.archived:""].filter(Boolean).join(" "),"aria-selected":C.sessionId===h,title:C.mtime??"",onClick:()=>{B||e.onOpenSession?.(C)}},l("span",{className:a.sessionSlot}),l("span",{className:a.sessionTitle,onDoubleClick:J=>{J.stopPropagation(),e.onRenameSession?.(C)}},C.title||C.sessionId),l("span",{className:a.resting},G&&!B?l(k.IconPinFillRegular,{size:14}):null,l("span",{className:a.time},C.writerName??"")),l("span",{className:a.rowActions,onClick:J=>J.stopPropagation()},ne||a.rowButton===""?null:l(se.default.Fragment,null,l("button",{type:"button",className:a.rowButton,"aria-label":B?t.unarchiveSession:t.archiveSession,onClick:J=>{J.stopPropagation(),e.onToggleArchive?.(C)}},l(B?k.IconUnarchiveOutlineRegular:k.IconArchiveOutlineRegular,{size:14})),l("button",{type:"button",className:a.rowButton,"aria-label":G?t.unpinSession:t.pinSession,onClick:J=>{J.stopPropagation(),e.onTogglePin?.(C)}},l(G?k.IconPinFillRegular:k.IconPinOutlineRegular,{size:14})))))}):[];return l("div",{key:x.workspaceId,className:a.group},l("div",{role:"treeitem",className:a.row,"data-nsw-loading":n?.sessionsReady!==!0||n?.pulling?.[x.workspaceId]===!0?"true":void 0,"aria-expanded":M,onClick:()=>D?e.onToggleWorkspace?.(x.workspaceId):e.onJoinWorkspace?.(x.workspaceId)},l("span",{className:a.folder},l(M?k.IconFolderOpenRegular:k.IconFolderCloseRegular)),l("span",{className:a.chevron},l(k.IconTriangleRightFillRegular,{className:M?`${a.arrow} ${a.arrowOpen}`:a.arrow})),l("span",{className:a.projectText},l("span",{className:a.title},x?.title??x?.workspaceId)),D?null:l("span",{className:a.time},t.stateIdle),l("span",{className:a.rowActions,onClick:C=>C.stopPropagation()},n?.sessionsReady!==!0||n?.pulling?.[x.workspaceId]===!0?l("span",{className:a.rowButton,role:"status","aria-label":t.sectionLoading},l(k.IconRefreshOutlineRegular,{size:14,className:"nsw-spin"})):D&&a.rowButton!==""?l("button",{type:"button",className:a.rowButton,"aria-label":t.newSession,onClick:C=>{C.stopPropagation(),e.onCreateSession?.(x.workspaceId)}},l(k.IconNewChatOutlineRegular,{size:14})):null)),ke.length>0?l("div",{role:"group"},ke):null)}),tn=f.length===0?l("div",{className:a.group},l("div",{role:"button",className:a.row,onClick:r?e.onCreateWorkspace:e.onOpenSettings},l("span",{className:a.folder}),l("span",{className:a.chevron}),l("span",{className:a.projectText},l("span",{className:a.title},t.emptyHint)))):null,we=y?ee:ee.slice(0,o),ge=ee.length-we.length,sn=ge>0?l("button",{type:"button",key:"more",className:"nsw-more",onClick:()=>w(!0)},t.showMore.replace("{n}",String(ge))):null,be=l("div",{className:a.list,role:"tree"},we,sn,ee.length===0?tn:null),on=a.treeBody?l("div",{className:a.treeBody},be):be;return l("div",{className:`nsw-root ${a.root}`,role:"complementary","aria-label":t.title},l("div",{className:a.header},...j),l("div",{ref:E,className:"nsw-reveal","data-open":g?"true":"false",style:g?{maxHeight:O}:void 0},l("div",{className:"nsw-reveal-inner"},l("div",{className:a.listArea},on))))}var Me=H(L("react"),1);var re=L("@deepseek-ai/dsh-client-ui-primitives");var xn="/nano-shared-workspace";async function P(e,s){let t=await fetch(`${xn}${e}`,{credentials:"same-origin",cache:"no-store",...s}),n=await t.json().catch(()=>({}));if(!t.ok)throw new Error(typeof n?.error=="string"?n.error:`HTTP ${t.status}`);return n}var je=()=>P("/settings"),Le=()=>P("/status");function Pe({username:e,token:s,accessKey:t}){return P("/settings/update",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({username:e,token:s,accessKey:t})})}var Ae=()=>P("/workspaces");function De(e,s){return P("/workspaces/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:e,localPath:s})})}function We(e,s){return P("/workspaces/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,localPath:s})})}var oe=()=>P("/sync",{method:"POST"});function $e(e,s){return P("/mkdir",{method:"POST",body:JSON.stringify({parent:e,name:s})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"mkdir failed");return t.path})}var ze=e=>P("/ls",{method:"POST",body:JSON.stringify(e===void 0?{}:{path:e})}),Fe=()=>P("/sessions");function ce(e){return P("/tree/pull",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e})}).then(s=>{if(s?.ok!==!0)throw new Error(s?.error??"pull failed");return s})}function Be(e,s){return P("/sessions/bind",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({path:e,sessionId:s})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"bind failed");return t})}function de(e,s){return P("/sessions/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})}).then(t=>{if(t?.busy===!0)return t;if(t?.ok!==!0)throw new Error(t?.error??"claim failed");return t})}function He(e,s){return P("/sessions/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})})}function qe(e,s){return P("/materialize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"materialize failed");return t})}var{createElement:v,useState:Z}=Me.default;function pe({label:e,children:s}){return v("label",{className:"nsw-field"},v("span",{className:"nsw-field-label"},e),s)}function Je({face:e,settings:s}){let t=e.copy(),[n,d]=Z(s?.username??""),[h,c]=Z(""),[y,w]=Z(""),[O,S]=Z(!1),[E,a]=Z(void 0),I=n.trim(),g=I!==""&&h.trim()!==""&&!O,o=async()=>{if(!g){a(I===""?t.usernameRequired:t.tokenRequired);return}S(!0),a(void 0);try{await Pe({username:I,token:h.trim(),accessKey:y.trim()===""?void 0:y.trim()}),e.settings.close()}catch(r){a(`${t.errorSave}: ${r instanceof Error?r.message:String(r)}`)}finally{S(!1)}};return v(z,{copy:t,title:t.settingsTitle,description:t.settingsDescription,confirmLabel:t.save,confirmDisabled:!g,busy:O,error:E,width:420,onConfirm:o,onCancel:e.settings.close},v("div",{className:"nsw-endpoint"},v("span",{className:"nsw-endpoint-row nsw-identity"},v("span",{className:"nsw-endpoint-key"},t.status),v("span",{className:"nsw-identity-value"},s?.configured===!0?`${t.configured} \xB7 ${s.username??"\u2014"}`:t.unconfigured),s?.configured===!0&&s?.maskedSecret!=null?v("span",{className:"nsw-identity-value","data-masked":"true"},s.maskedSecret):null),v("span",{className:"nsw-endpoint-row"},v("span",{className:"nsw-endpoint-key"},t.endpointLabel),v("code",{className:"nsw-endpoint-value"},s?.endpoint??"\u2014")),v("span",{className:"nsw-endpoint-row"},v("span",{className:"nsw-endpoint-key"},t.bucketLabel),v("code",{className:"nsw-endpoint-value"},s?.bucket??"\u2014"))),v(pe,{label:t.username},v(re.Input,{value:n,placeholder:t.usernamePlaceholder,"data-modal-autofocus":!0,onChange:r=>d(r.currentTarget.value)})),v(pe,{label:t.token},v(re.Input,{type:"password",value:h,placeholder:s?.configured===!0?`${t.configured} \xB7 ${s?.maskedSecret??""}`:t.tokenPlaceholder,onChange:r=>c(r.currentTarget.value)})),v(pe,{label:t.accessKeyOptional},v(re.Input,{value:y,placeholder:t.accessKeyPlaceholder,onChange:r=>w(r.currentTarget.value)})),v("label",{className:"nsw-pref"},v("input",{type:"checkbox",checked:s?.expandOnLoad!==!1,onChange:r=>e.setExpandOnLoad(r.currentTarget.checked)}),v("span",null,v("span",{className:"nsw-field-label"},t.expandOnLoad),v("span",{className:"nsw-join-hint"},t.expandOnLoadHint))),v("p",{className:"nsw-join-hint"},t.joinHint))}var Ke=H(L("react"),1);var{createElement:U}=Ke.default;function kn(e){let s=e?.data??{};if(e?.type==="user/message")return{role:"user",text:(s.content??[]).filter(n=>n?.type==="text").map(n=>n.text).join(`
`)};if(e?.type==="assistant/message"){let t=(s.message?.content??[]).filter(d=>d?.type==="text").map(d=>d.text).join(`
`);return{role:"assistant",text:[(s.message?.content??[]).filter(d=>d?.type==="reasoning").map(d=>d.text).join(`
`),t].filter(Boolean).join(`

`)}}return e?.type==="tool/call"?{role:"tool",text:`${s.name??s.tool??"tool"} ${JSON.stringify(s.input??s.args??{}).slice(0,160)}`}:null}function _e({face:e,transcript:s}){let t=e.copy(),n=s?.events??[],d=n.map(kn).filter(h=>h!==null&&h.text.trim()!=="");return U(z,{copy:t,title:s?.meta?.title??t.transcriptFallback,confirmLabel:t.closeLabel??"Close",onConfirm:e.onCloseTranscript,onCancel:e.onCloseTranscript},U("div",{className:"nsw-transcript-meta"},`${s?.meta?.writerName??"?"} \xB7 ${s?.meta?.mtime??""} \xB7 ${n.length} events \xB7 ${s?.meta?.committedBytes??0}B`),U("div",{className:"nsw-transcript-body"},d.length===0?U("p",{className:"nsw-notice"},t.transcriptEmpty):d.map((h,c)=>U("div",{key:c,className:`nsw-transcript-row nsw-role-${h.role}`},U("span",{className:"nsw-transcript-role"},t[`role_${h.role}`]??h.role),U("span",{className:"nsw-transcript-text"},h.text)))))}var ue=H(L("react"),1);var{createElement:R,useEffect:vn,useRef:Sn,useState:V}=ue.default;function Ue({face:e,mode:s,workspaceId:t}){let n=e.copy(),[d,h]=V(""),[c,y]=V(null),[w,O]=V(null),[S,E]=V(!1),[a,I]=V(""),[g,o]=V(!1),[r,p]=V(null),u=Sn(0),N=m=>{let A=++u.current;o(!0),e.listDirectory(m).then(j=>{u.current===A&&y(j)}).catch(j=>p(j instanceof Error?j.message:String(j))).finally(()=>{u.current===A&&o(!1)})};vn(()=>{N(void 0)},[]);let i=m=>{o(!0),(s==="join"?e.joinWorkspace(t,m):e.createWorkspace(d.trim(),m)).then(()=>e.onCloseCreateDialog?.(!0)).catch(j=>p(`${n.createFailed}: ${j instanceof Error?j.message:String(j)}`)).finally(()=>o(!1))},f=s==="join"||d.trim()!=="";return R(z,{copy:n,title:s==="join"?n.pickReplicaTitle:n.createTitle,confirmLabel:s==="join"?n.joinHere:n.createHere,confirmDisabled:!f||g||c===null,busy:g,onConfirm:()=>i(w??c?.path),onCancel:()=>e.onCloseCreateDialog?.(!1)},R("div",{className:"nsw-create-body"},s==="create"?R("label",{className:"nsw-field"},R("span",{className:"nsw-field-label"},n.workspaceName),R("input",{className:"nsw-input",value:d,onChange:m=>h(m.target.value),placeholder:n.workspaceNameHint})):null,R("p",{className:"nsw-field-label"},n.pickReplicaHint),R("div",{className:"nsw-crumbs"},(c?.crumbs??[]).map((m,A)=>R(ue.default.Fragment,{key:m.path},A>0?R("span",{className:"nsw-crumb-sep"},"/"):null,R("button",{type:"button",className:"nsw-crumb",onClick:()=>N(m.path)},m.name===""?"/":m.name)))),R("div",{className:"nsw-entries"},g&&c===null?R("p",{className:"nsw-notice"},n.loading):null,(c?.entries??[]).filter(m=>!m.hidden).map(m=>R("button",{type:"button",key:m.path,className:`nsw-entry${w===m.path?" nsw-entry-selected":""}`,onClick:()=>O(m.path),onDoubleClick:()=>N(m.path)},m.name)),c!==null&&(c.entries??[]).filter(m=>!m.hidden).length===0?R("p",{className:"nsw-notice"},n.emptyDir):null),S?R("div",{className:"nsw-new-folder"},R("input",{className:"nsw-input",value:a,onChange:m=>I(m.target.value),placeholder:n.newFolder}),R("button",{type:"button",className:"nsw-button",disabled:a.trim()===""||g,onClick:()=>{o(!0),e.createDirectory(c.path,a.trim()).then(m=>{E(!1),I(""),O(m),N(c.path)}).catch(m=>p(m instanceof Error?m.message:String(m))).finally(()=>o(!1))}},n.createFolder)):R("button",{type:"button",className:"nsw-link-button",onClick:()=>E(!0)},`\uFF0B ${n.newFolder}`),r!==null?R("p",{className:"nsw-notice"},r):null))}var Ve="data-nano-shared-workspace";function Nn(){return document.querySelector('[role="tree"]')}function Ge(){let e=Nn();for(;e!==null&&e!==document.body;){let s=e.parentElement;if(s!==null&&s.querySelector(":scope > nav")!==null)return e;e=s}for(let s of document.querySelectorAll("nav")){if(s.parentElement===null)continue;let n=s.nextElementSibling;if(n!==null&&n.tagName==="DIV"&&n.querySelector("nav")===null)return n}return null}function me(){let e=Ge();return e===null?!0:e.getBoundingClientRect().width>80}function he(){let e=Ge();if(e===null)return null;let s=e.querySelector(`[${Ve}]`);return s===null?(s=document.createElement("div"),s.setAttribute(Ve,""),s.className="nsw-graft",e.prepend(s)):s!==e.firstElementChild&&e.prepend(s),s}function On({face:e,rename:s}){let t=e.copy(),[n,d]=T.default.useState(s?.title??""),[h,c]=T.default.useState(void 0),[y,w]=T.default.useState(!1),O=async()=>{w(!0),c(void 0);try{await e.confirmRename(n)}catch(S){c(S instanceof Error?S.message:String(S)),w(!1)}};return T.default.createElement(z,{copy:t,title:t.renameSessionTitle,confirmLabel:t.renameSession,confirmDisabled:n.trim()===""||y,busy:y,error:h,onConfirm:O,onCancel:e.cancelRename},T.default.createElement(Ye.Input,{value:n,"data-modal-autofocus":!0,onChange:S=>d(S.currentTarget.value)}))}function Xe({face:e,renderSlot:s}){let[t,n]=T.default.useState(()=>he()),[d,h]=T.default.useState(()=>me()),[c,y]=T.default.useState(e.settings.current);return T.default.useEffect(()=>e.settings.subscribe(y),[]),T.default.useEffect(()=>{let w=new MutationObserver(()=>{n(he()),h(me())});return w.observe(document.body,{childList:!0,subtree:!0,attributes:!0}),n(he()),h(me()),()=>{w.disconnect(),t?.remove()}},[]),t===null?null:T.default.createElement(T.default.Fragment,null,(0,Y.createPortal)(T.default.createElement(Ee,{face:e,wide:d}),t),c?.open===!0?(0,Y.createPortal)(T.default.createElement(Je,{face:e,settings:c}),document.body):null,c?.transcript!=null?(0,Y.createPortal)(T.default.createElement(_e,{face:e,transcript:c.transcript}),document.body):null,typeof c?.notice=="string"&&c.notice!==""?(0,Y.createPortal)(T.default.createElement(z,{copy:e.copy(),title:e.copy().noticeTitle,confirmLabel:e.copy().closeLabel,onConfirm:e.dismissNotice,onCancel:e.dismissNotice},c.notice),document.body):null,c?.rename!=null?(0,Y.createPortal)(T.default.createElement(On,{face:e,rename:c.rename}),document.body):null,c?.createDialog!=null?(0,Y.createPortal)(T.default.createElement(Ue,{face:e,mode:c.createDialog.mode,workspaceId:c.createDialog.workspaceId}),document.body):null)}var Qe={zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A",railTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A",settings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",viewOptions:"\u89C6\u56FE\u9009\u9879",addWorkspace:"\u6DFB\u52A0\u5171\u4EAB\u5DE5\u4F5C\u533A",filterAll:"\u5168\u90E8\u5171\u4EAB\u5DE5\u4F5C\u533A",filterMine:"\u53EA\u770B\u6211\u52A0\u5165\u7684",workspaceCreated:"\u5DF2\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",createFailed:"\u521B\u5EFA\u5DE5\u4F5C\u533A\u5931\u8D25",enterFailed:"\u65E0\u6CD5\u8FDB\u5165\u8FD9\u4E2A\u5171\u4EAB\u5DE5\u4F5C\u533A",pullFailed:"\u65E0\u6CD5\u4ECE\u5171\u4EAB\u7A7A\u95F4\u8F7D\u5165\u8FD9\u4E2A\u4F1A\u8BDD",noticeTitle:"\u65E0\u6CD5\u6253\u5F00",workspaceAddLocal:"\u6DFB\u52A0\u5DE5\u4F5C\u533A",creating:"\u6B63\u5728\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A\u2026",syncPushed:"\u5DF2\u63A8\u9001",transcriptFallback:"\u8FDC\u7A0B\u4F1A\u8BDD",transcriptEmpty:"\u8BE5\u4F1A\u8BDD\u6682\u65E0\u53EF\u8BFB\u5185\u5BB9",transcriptFailed:"\u8BFB\u53D6\u4F1A\u8BDD\u5931\u8D25",role_user:"\u7528\u6237",role_assistant:"\u52A9\u624B",role_tool:"\u5DE5\u5177",createTitle:"\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",pickReplicaTitle:"\u52A0\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",workspaceName:"\u5DE5\u4F5C\u533A\u540D\u79F0",workspaceNameHint:"\u4F8B\u5982 team-portal",pickReplicaHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u5B58\u653E\u4F4D\u7F6E\uFF08\u4E91\u7AEF\u624D\u662F\u771F\u6E90\uFF09",loading:"\u52A0\u8F7D\u76EE\u5F55\u2026",emptyDir:"\u8BE5\u76EE\u5F55\u4E3A\u7A7A",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",createFolder:"\u521B\u5EFA",createHere:"\u521B\u5EFA\u5230\u6B64\u76EE\u5F55",joinHere:"\u52A0\u5165\u5230\u6B64\u76EE\u5F55",joinHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u4F4D\u7F6E\u4EE5\u52A0\u5165",readOnlyBusy:"\u53EA\u8BFB\uFF1A{holder} \u6B63\u5728\u5199\u8FD9\u6761\u4F1A\u8BDD\uFF0C\u79DF\u7EA6\u7ED3\u675F\u524D\u4E0D\u80FD\u5360\u7528",closeLabel:"\u5173\u95ED",settingsTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A\u8BBE\u7F6E",settingsDescription:"\u8EAB\u4EFD\u5199\u5165\u51ED\u636E\u5B58\u50A8\uFF1BS3 \u771F\u6E90\u7AEF\u70B9\u5728\u670D\u52A1\u7AEF\u914D\u7F6E\u4E2D\u56FA\u5B9A\u3002",username:"\u7528\u6237\u540D",usernamePlaceholder:"\u5728\u5171\u4EAB\u7A7A\u95F4\u663E\u793A\u7684\u540D\u5B57",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key \u6216\u670D\u52A1\u7AEF\u4EE4\u724C",accessKeyOptional:"\u8BBF\u95EE\u5BC6\u94A5\uFF08\u53EF\u9009\uFF09",accessKeyPlaceholder:"\u72EC\u7ACB access key \u65F6\u586B\u5199",endpointLabel:"\u7AEF\u70B9",bucketLabel:"\u5B58\u50A8\u6876",status:"\u72B6\u6001",configured:"\u5DF2\u914D\u7F6E",unconfigured:"\u672A\u914D\u7F6E",emptyHint:"\u8BF7\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",sectionLoading:"\u6B63\u5728\u8F7D\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",newSession:"\u65B0\u5EFA\u4F1A\u8BDD",renameSession:"\u91CD\u547D\u540D",renameSessionTitle:"\u91CD\u547D\u540D\u4F1A\u8BDD",pinSession:"\u7F6E\u9876",unpinSession:"\u53D6\u6D88\u7F6E\u9876",archiveSession:"\u5F52\u6863",unarchiveSession:"\u53D6\u6D88\u5F52\u6863",expandSection:"\u5C55\u5F00\u5171\u4EAB\u5DE5\u4F5C\u533A",collapseSection:"\u6536\u8D77\u5171\u4EAB\u5DE5\u4F5C\u533A",showMore:"\u5C55\u5F00\u5176\u4F59 {n} \u4E2A",expandOnLoad:"\u52A0\u8F7D\u5B8C\u6210\u540E\u5C55\u5F00\u5DE5\u4F5C\u533A",expandOnLoadHint:"\u9ED8\u8BA4\u5C55\u5F00\u524D 3 \u4E2A\uFF0C\u5176\u4F59\u6536\u8D77\uFF0C\u53EF\u518D\u624B\u52A8\u5C55\u5F00\u3002",stateJoined:"\u5DF2\u52A0\u5165",stateIdle:"\u672A\u52A0\u5165",usernameRequired:"\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A",tokenRequired:"MinIO Token \u4E0D\u80FD\u4E3A\u7A7A",saved:"\u5DF2\u4FDD\u5B58",clear:"\u6E05\u9664",clearTitle:"\u6E05\u9664\u5171\u4EAB\u51ED\u636E",clearBody:"\u5220\u9664\u672C\u673A\u4FDD\u5B58\u7684\u7528\u6237\u540D\u548C MinIO Token\uFF0C\u5E76\u65AD\u5F00\u5171\u4EAB\u7A7A\u95F4\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",cancel:"\u53D6\u6D88",confirm:"\u4FDD\u5B58",close:"\u5173\u95ED",save:"\u4FDD\u5B58",joinHint:"\u591A\u53F0\u5BA2\u6237\u7AEF\u4F7F\u7528\u540C\u4E00\u7528\u6237\u540D + Token \u5373\u89C6\u4E3A\u540C\u4E00\u8EAB\u4EFD\u3002",errorLoad:"\u8BFB\u53D6\u8BBE\u7F6E\u5931\u8D25",errorSave:"\u4FDD\u5B58\u5931\u8D25"},en:{title:"Shared Workspace",railTitle:"Shared Workspace",settings:"Settings",refresh:"Refresh",viewOptions:"View options",addWorkspace:"Add shared workspace",filterAll:"All shared workspaces",filterMine:"Only ones I joined",workspaceCreated:"Shared workspace created",createFailed:"Failed to create workspace",enterFailed:"Could not open this shared workspace",pullFailed:"Could not load this session from the shared space",noticeTitle:"Could not open",workspaceAddLocal:"Add workspace",creating:"Creating shared workspace\u2026",syncPushed:"Pushed",transcriptFallback:"Remote session",transcriptEmpty:"Nothing readable in this session yet",transcriptFailed:"Failed to read session",role_user:"User",role_assistant:"Assistant",role_tool:"Tool",createTitle:"New shared workspace",pickReplicaTitle:"Join shared workspace",workspaceName:"Workspace name",workspaceNameHint:"e.g. team-portal",pickReplicaHint:"Pick the local replica location (the cloud is canonical)",loading:"Loading directory\u2026",emptyDir:"This directory is empty",newFolder:"New folder",createFolder:"Create",createHere:"Create here",joinHere:"Join here",joinHint:"Pick a local replica location to join",readOnlyBusy:"Read-only: {holder} holds this session until the lease expires",closeLabel:"Close",settingsTitle:"Shared Workspace Settings",settingsDescription:"Identity is stored in the credential store; the S3 source of truth is fixed in server config.",username:"Username",usernamePlaceholder:"Name shown in the shared space",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key or server token",accessKeyOptional:"Access Key (optional)",accessKeyPlaceholder:"Only for a separate access key",endpointLabel:"Endpoint",bucketLabel:"Bucket",status:"Status",configured:"Configured",unconfigured:"Not configured",emptyHint:"Create a shared workspace",sectionLoading:"Loading shared workspaces",newSession:"New session",renameSession:"Rename",renameSessionTitle:"Rename session",pinSession:"Pin",unpinSession:"Unpin",archiveSession:"Archive",unarchiveSession:"Unarchive",expandSection:"Expand shared workspaces",collapseSection:"Collapse shared workspaces",showMore:"Show {n} more",expandOnLoad:"Expand after loading",expandOnLoadHint:"Shows the first 3, and keeps the rest collapsed until you ask.",stateJoined:"Joined",stateIdle:"Not joined",usernameRequired:"Username is required",tokenRequired:"MinIO token is required",saved:"Saved",clear:"Clear",clearTitle:"Clear shared credentials",clearBody:"Remove the locally stored username and MinIO token and leave the shared space. This cannot be undone.",cancel:"Cancel",confirm:"Save",close:"Close",save:"Save",joinHint:"Clients sharing the same username + token count as one identity.",errorLoad:"Failed to load settings",errorSave:"Failed to save"}},W=e=>Qe[e==="zh"?"zh":"en"]??Qe.en;var Ze=`
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
`;var In=["slots","locale","layout","uiWorkspace","workspaces","sessions"],Cn="nanoSharedWorkspace",en="nsw-section-prefs",fe=3;function nn(){try{return{expandOnLoad:JSON.parse(localStorage.getItem(en)||"")?.expandOnLoad!==!1,expandLimit:fe}}catch{return{expandOnLoad:!0,expandLimit:fe}}}function Rn(){let e={open:!1,loaded:!1,configured:!1,username:null,sessionsReady:!1,pulling:{},...nn()},s=new Set,t=()=>{for(let n of s)n()};return{get current(){return e},set(n){e={...e,...n},t()},subscribe:n=>(s.add(n),()=>s.delete(n))}}function Tn(e){let s=document.createElement("style");s.dataset.nswStyle="true",s.textContent=Ze,document.head.append(s),e.effect(()=>()=>s.remove());let t=()=>e.locale.getSnapshot().active,n=Rn(),d=(o,r)=>Object.values(o?.members??{}).find(p=>p?.username===r)?.localPath??"",h=()=>{let o=document.querySelector("[data-nano-shared-workspace]"),r=n.current.username,p=new Set;for(let i of n.current.sharedWorkspaces??[]){let f=d(i,r);f&&p.add(f.replace(/\/+$/,""))}let u=new Set([...(n.current.sessions??[]).map(i=>i.sessionId),...n.current.ownedSessionIds??[]]),N=new Set((e.workspaces.list.getSnapshot().items??[]).filter(i=>p.has(i.path?.replace(/\/+$/,""))).map(i=>i.workspaceId));for(let i of document.querySelectorAll('[data-row-key^="workspace:"]')){if(o?.contains(i))continue;let f=i.getAttribute("data-row-key").slice(10),m=i.closest('[class*="groupSection"]')??i,A=N.has(f);m.hidden!==A&&(m.hidden=A)}for(let i of document.querySelectorAll('[data-row-key^="session:"]')){if(o?.contains(i))continue;let f=i.getAttribute("data-row-key").slice(8),m=u.has(f);i.hidden!==m&&(i.hidden=m)}for(let i of document.querySelectorAll('[data-row-key="workspace:"]')){if(o?.contains(i))continue;let f=i.closest('[class*="groupSection"]')??i.parentElement;if(f==null)continue;let m=[...f.querySelectorAll('[data-row-key^="session:"]')],A=m.length>0&&m.every(j=>j.hidden);f.hidden!==A&&(f.hidden=A)}},c=()=>{je().then(o=>(n.set({...o,loaded:!0}),Ae().then(r=>{let p=r.workspaces??[],u=n.current.listReady!==!0;n.set({sharedWorkspaces:p,listReady:!0,...u?{sectionOpen:nn().expandOnLoad}:{}}),h()}).catch(()=>n.set({listReady:!0,...n.current.listReady!==!0?{sectionOpen:!1}:{}})))).catch(()=>n.set({loaded:!0,listReady:!0})),Le().catch(()=>{}),Fe().then(o=>{n.set({sessions:o.sessions??[],sessionsReady:!0}),h()}).catch(()=>n.set({sessionsReady:!0}))},y=()=>{let o=e.workspaces.list.getSnapshot();n.set({pinnedSessionIds:[...o.pinnedSessionIds??[]],archivedSessionIds:[...o.archivedSessionIds??[]]})};typeof e.workspaces.list.subscribe=="function"&&e.workspaces.list.subscribe(y),y();let w=(o,r)=>{let p={...n.current.pulling??{}};r?p[o]=!0:delete p[o],n.set({pulling:p})},O=0,S=(o,r)=>{window.clearInterval(O),O=window.setInterval(()=>{He(o,r).catch(()=>window.clearInterval(O))},25e3)},E=async o=>{let r=o.replace(/\/+$/,""),p=e.workspaces.list.getSnapshot().items?.find(u=>u.path?.replace(/\/+$/,"")===r);return p||e.workspaces.create({path:o})},a=async(o,r)=>{let p=r!=null&&e.sessions.list.getSnapshot().byId?.[r]!=null;r!=null&&!p&&(await qe(o,r),await e.sessions.refresh())},I={copy:()=>W(t()),currentSessionId:()=>{let o=e.sessions.list.getSnapshot().byId??{};return Object.values(o).find(r=>(r.retainedBy?.mainView??0)>0)?.id??null},subscribeSession:o=>e.sessions.list.subscribe(()=>o(Object.values(e.sessions.list.getSnapshot().byId??{}).find(r=>(r.retainedBy?.mainView??0)>0)?.id??null)),settings:{get current(){return n.current},get open(){return n.current.open===!0},subscribe:o=>n.subscribe(()=>o(n.current)),close:()=>n.set({open:!1})},onOpenSettings:()=>{c(),n.set({open:!0})},onToggleSection:()=>{n.current.listReady===!0&&n.set({sectionOpen:n.current.sectionOpen!==!0})},setExpandOnLoad:o=>{let r={expandOnLoad:o===!0,expandLimit:fe};localStorage.setItem(en,JSON.stringify(r)),n.set(r)},onRefresh:()=>{n.set({syncing:!0}),oe().then(o=>{o.pushed>0&&n.set({notice:`${W(t()).syncPushed} ${o.pushed}`})}).catch(()=>{}).finally(()=>{n.set({syncing:!1}),c()})},onToggleWorkspace:o=>{let r=n.current.expanded?.[o]===!0;n.set({expanded:{...n.current.expanded??{},[o]:!r}})},onCreateSession:o=>{let r=(n.current.sharedWorkspaces??[]).find(u=>u.workspaceId===o),p=d(r,n.current.username);if(p===""){n.set({notice:W(t()).joinHint});return}n.set({notice:null,sectionOpen:!0,expanded:{...n.current.expanded??{},[o]:!0}}),w(o,!0),ce(o).finally(()=>w(o,!1)).then(()=>E(p)).then(u=>e.sessions.create({workspaceId:u.workspaceId})).then(u=>de(o,u).then(N=>{if(N?.busy===!0)throw new Error(W(t()).readOnlyBusy.replace("{holder}",N.holder??""));return S(o,u),u})).then(u=>{let N={workspaceId:o,sessionId:u,title:"",writerName:n.current.username??"",cwd:p};n.set({ownedSessionIds:[...n.current.ownedSessionIds??[],u],sessions:[N,...(n.current.sessions??[]).filter(i=>i.sessionId!==u)]}),h(),e.uiWorkspace.openSession(u),oe().finally(()=>c())}).catch(u=>n.set({notice:`${W(t()).enterFailed}: ${u instanceof Error?u.message:String(u)}`}))},onOpenSession:o=>{n.set({notice:null,sectionOpen:!0,expanded:{...n.current.expanded??{},[o.workspaceId]:!0}});let r=()=>e.sessions.list.getSnapshot().byId?.[o.sessionId]!=null,p=()=>d((n.current.sharedWorkspaces??[]).find(f=>f.workspaceId===o.workspaceId),n.current.username),u=async()=>{let f=p();if(f!==""){let m=await E(f);e.workspaces.list.getSnapshot().items?.find(j=>j.workspaceId===m.workspaceId)?.sessionIds?.includes(o.sessionId)===!0||await Be(f,o.sessionId)}n.set({ownedSessionIds:[...n.current.ownedSessionIds??[],o.sessionId]}),h(),e.uiWorkspace.openSession(o.sessionId)},N=f=>{if(f?.busy===!0){n.set({notice:W(t()).readOnlyBusy.replace("{holder}",f.holder??"")});return}S(o.workspaceId,o.sessionId)};w(o.workspaceId,!0),(r()?u():a(o.workspaceId,o.sessionId).then(u)).then(()=>Promise.all([ce(o.workspaceId).finally(()=>w(o.workspaceId,!1)).catch(()=>{}),de(o.workspaceId,o.sessionId).then(N)])).catch(f=>n.set({notice:`${W(t()).pullFailed}: ${f instanceof Error?f.message:String(f)}`}))},onTogglePin:o=>{let p=(n.current.pinnedSessionIds??[]).includes(o.sessionId)?e.uiWorkspace.unpinSession(o.sessionId):e.uiWorkspace.pinSession(o.sessionId);Promise.resolve(p).catch(u=>n.set({notice:`${W(t()).pinSession}: ${u instanceof Error?u.message:String(u)}`}))},onToggleArchive:o=>{let p=(n.current.archivedSessionIds??[]).includes(o.sessionId)?e.uiWorkspace.unarchiveSession(o.sessionId):e.uiWorkspace.archiveSession(o.sessionId);Promise.resolve(p).catch(u=>n.set({notice:`${W(t()).archiveSession}: ${u instanceof Error?u.message:String(u)}`}))},onRenameSession:o=>n.set({rename:{workspaceId:o.workspaceId,sessionId:o.sessionId,title:o.title||""}}),confirmRename:o=>{let r=n.current.rename;if(r==null)return Promise.resolve();let p=o.trim();return p===""?Promise.resolve():e.sessions.using(r.sessionId,{source:"workspaceOperation"},u=>u.binding.session.rename(p)).then(u=>{if(u?.ok===!1)throw new Error(u.error?.message??"rename failed");n.set({rename:null,sessions:(n.current.sessions??[]).map(N=>N.sessionId===r.sessionId?{...N,title:p}:N)}),oe().catch(()=>{})})},cancelRename:()=>n.set({rename:null}),dismissNotice:()=>n.set({notice:null}),onCloseTranscript:()=>n.set({transcript:null}),onToggleRail:()=>e.layout?.toggleSidebar?.(),onCreateWorkspace:()=>{n.current.creating!==!0&&n.set({createDialog:{mode:"create"}})},onJoinWorkspace:o=>n.set({createDialog:{mode:"join",workspaceId:o}}),onCloseCreateDialog:o=>{n.set({createDialog:null,creating:!1}),o&&(n.set({notice:W(t()).workspaceCreated}),c())},createWorkspace:(o,r)=>(n.set({creating:!0}),De(o,r)),joinWorkspace:(o,r)=>(n.set({creating:!0}),We(o,r)),createDirectory:$e,listDirectory:ze,uiWorkspace:e.uiWorkspace,onViewOptions:o=>{let r=o?.currentTarget?.getBoundingClientRect?.();if(r===void 0)return;let p=W(t());ie({anchor:r,items:[{id:"all",label:p.filterAll,run:()=>n.set({viewFilter:"all"})},{id:"mine",label:p.filterMine,run:()=>n.set({viewFilter:"mine"})},{id:"settings",label:p.settingsTitle??p.settings,run:()=>n.set({open:!0})}]})}};e.effect(()=>e.locale.register(Cn,{zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A"},en:{title:"Shared Workspace"}}),"nano-shared-workspace: dictionaries"),e.effect(()=>e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"nano-shared-workspace.section",inject:()=>({face:I})},Xe)),"nano-shared-workspace: sidebar graft"),window.__nsw={store:n,ctx:e,face:I};let g=new MutationObserver(()=>h());g.observe(document.body,{childList:!0,subtree:!0}),e.effect(()=>()=>g.disconnect()),c()}return mn(En);})();
		return __nswExport;
	}
});
