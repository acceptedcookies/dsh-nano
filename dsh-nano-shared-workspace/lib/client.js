window.__ModuleLoader__.load({
	id: "dsh-nano-shared-workspace",
	factory: (require) => {
var __nswExport=(()=>{var dn=Object.create;var ae=Object.defineProperty;var pn=Object.getOwnPropertyDescriptor;var un=Object.getOwnPropertyNames;var mn=Object.getPrototypeOf,hn=Object.prototype.hasOwnProperty;var D=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(s,t)=>(typeof require<"u"?require:s)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var fn=(e,s)=>{for(var t in s)ae(e,t,{get:s[t],enumerable:!0})},Ce=(e,s,t,n)=>{if(s&&typeof s=="object"||typeof s=="function")for(let m of un(s))!hn.call(e,m)&&m!==t&&ae(e,m,{get:()=>s[m],enumerable:!(n=pn(s,m))||n.enumerable});return e};var K=(e,s,t)=>(t=e!=null?dn(mn(e)):{},Ce(s||!e||!e.__esModule?ae(t,"default",{value:e,enumerable:!0}):t,e)),wn=e=>Ce(ae({},"__esModule",{value:!0}),e);var Pn={};fn(Pn,{apply:()=>Ln,inject:()=>In});var it=D("react");var U=K(D("react"),1),te=D("@deepseek-ai/dsh-client-ui-primitives");function z({copy:e,title:s,description:t,confirmLabel:n,confirmDisabled:m,busy:r,error:d,danger:S,footer:b,maxHeight:N,width:C,region:j,onConfirm:i,onCancel:E,children:v}){return U.default.createElement(te.Modal,{open:!0,onClose:E,title:s,description:t,closeLabel:e.cancel,className:["nano-dialog-card",N===void 0?"":"nano-dialog-capped",C===void 0?"":"nano-dialog-sized",j===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:b??U.default.createElement(U.default.Fragment,null,U.default.createElement(te.Button,{variant:"outline",className:"nano-modal-action",onClick:E},e.cancel),U.default.createElement(te.Button,{variant:S?"outline":"primary",className:S?"nano-modal-action nano-modal-danger":"nano-modal-action",disabled:m===!0||r===!0,onClick:i},n??e.confirm))},v,d===void 0?null:U.default.createElement("p",{className:"nano-dialog-error",role:"alert"},d))}var V=K(D("react"),1),{useCallback:Wn,useEffect:Ee,useRef:Re,useState:gn}=V.default;function Oe({menu:e,actions:s,onClose:t,width:n=208,maxHeight:m}){let r=Re(null),[d,S]=gn(0),b=e===null?[]:s,N=b.length,C=Re(b);C.current=b;let j=e===null?null:e.openedAt;if(Ee(()=>{j!==null&&S(0)},[j]),Ee(()=>{if(e===null)return;let o=c=>{r.current!==null&&!r.current.contains(c.target)&&t()},l=c=>{if(c.key==="Escape"){c.stopPropagation(),t();return}if(c.key==="ArrowDown"){c.preventDefault(),S(u=>(u+1)%N);return}if(c.key==="ArrowUp"){c.preventDefault(),S(u=>(u-1+N)%N);return}c.key==="Enter"&&(c.preventDefault(),t(),C.current[d]?.run())};return document.addEventListener("pointerdown",o,!0),document.addEventListener("keydown",l,!0),()=>{document.removeEventListener("pointerdown",o,!0),document.removeEventListener("keydown",l,!0)}},[e,d,N,t]),e===null||N===0)return null;let i=N*28+8,E=Math.min(e.x,(window.innerWidth||n)-n-8),v=Math.min(e.y,(window.innerHeight||i)-i-8);return V.default.createElement("div",{className:"nano-menu",role:"menu",ref:r,style:{position:"fixed",left:`${Math.max(8,E)}px`,top:`${Math.max(8,v)}px`,minWidth:`${n}px`,...typeof m=="number"?{maxHeight:`${Math.round(m)}px`,overflowY:"auto",overscrollBehavior:"contain"}:{}},"data-nano-menu":"true"},b.map((o,l)=>V.default.createElement(bn,{key:o.id,item:o,index:l,active:l===d,onHover:S,onRun:t})))}function bn({item:e,index:s,active:t,onHover:n,onRun:m}){return V.default.createElement("button",{type:"button",role:"menuitem",className:"nano-menu-item","data-active":String(t),"data-tone":e.tone??"default",onMouseEnter:()=>n(s),onClick:()=>{m(),e.run()}},e.icon===void 0?null:V.default.createElement("span",{className:"nano-menu-icon","aria-hidden":"true"},e.icon),V.default.createElement("span",{className:"nano-menu-label"},e.label))}var Ie=K(D("react"),1),Te=D("react-dom/client");function de(e){let s=document.createElement("div");s.className="nano-menu-host",document.body.appendChild(s);let t=(0,Te.createRoot)(s),n=()=>{t.unmount(),s.remove()},m=e.anchor,r=m.left!==void 0?m.left:m.x,d=(m.bottom!==void 0?m.bottom:(m.y??0)+(m.height??0))+(e.gap??0);return t.render(Ie.default.createElement(Oe,{menu:{x:r,y:d,openedAt:Date.now()},actions:e.items??[],width:e.width,maxHeight:e.maxHeight,onClose:n})),{close:n}}var T=K(D("react"),1),Q=D("react-dom");var Ze=D("@deepseek-ai/dsh-client-ui-primitives");var ie=K(D("react"),1),g=D("@deepseek-ai/dsh-client-ui-primitives"),{createElement:p,useEffect:je,useLayoutEffect:Le,useRef:yn,useState:se}=ie.default;var k=e=>e?.getAttribute?.("class")??"",H=e=>String(e).split(/\s+/).filter(Boolean),M=e=>H(e).filter(s=>!/_wide$/.test(s)).join(" "),B=(e,s)=>{let t=String(e).lastIndexOf("_");return t<0?"":e.slice(0,t+1)+s};function xn(){let e=document.querySelector("[data-nano-shared-workspace]"),s=[...document.querySelectorAll("span")].find(a=>!e?.contains(a)&&a.children.length===0&&(a.textContent?.trim()==="\u5DE5\u4F5C\u533A"||a.textContent?.trim()==="Workspace")),t=s?.parentElement,n=t?.parentElement;if(t==null||n==null)return null;let m=[...n.children].find(a=>/listArea/.test(k(a))),r=m?.querySelector('[role="tree"]'),d=[...n.querySelectorAll('[class*="projectRow"]')].find(a=>!String(a.className).includes("menuOpen"));if(m==null||r==null||d==null)return null;let S=t.querySelector('[class*="searchSlot"]'),b=t.querySelector('[class*="headerActions"]'),N=S?.querySelector(":scope > div"),C=N?.querySelector("button")??S?.querySelector("button");if(S==null||b==null||C==null)return null;let j=d.querySelector('[class*="folder"]'),i=d.querySelector('[class*="chevron"]'),E=[...d.children].find(a=>/Text/.test(k(a))),v=E?.querySelector('[class*="title"]'),o=H(k(i?.querySelector("svg"))).find(a=>/arrow/.test(a)&&!/Open/.test(a))??"",l=H(k(d))[0]??"",c=[...n.querySelectorAll('[class*="sessionRow"]')].find(a=>!String(a.className).includes("selected")),u=M(H(k(c)).filter(a=>!/selected/.test(a)).join(" ")),y=[];for(let a of t.children){let f=getComputedStyle(a);if(f.display==="none"||f.position==="absolute"||f.position==="fixed"||k(a)===""&&a.getBoundingClientRect().width===0)continue;let h=a===s?"label":a===S?"search":a===b?"actions":"other";y.push({slot:h,cls:M(k(a))})}return{root:k(n),header:M(k(t)),template:y,search:k(N),searchButton:M(k(C)),actions:M(k(b)),button:M(k(b.querySelector("button"))),listArea:k(m),treeBody:r.parentElement===m?"":M(k(r.parentElement)),list:k(r),group:H(k(d.closest('[class*="groupSection"]'))).filter(a=>!/drop/.test(a)).join(" "),row:H(k(d)).filter(a=>!/menuOpen|drop/.test(a)).join(" "),folder:H(k(j)).filter(a=>!/Active/.test(a)).join(" "),chevron:k(i),projectText:k(E),title:k(v)||B(l,"title"),rowActions:k([...d.children].find(a=>/Actions/.test(k(a)))),rowButton:M(k(d.querySelector('[class*="rowActions"] button'))),arrow:o,arrowOpen:o?B(o,"arrowOpen"):"",sessionRow:u||B(l,"sessionRow"),selected:B(H(u).find(a=>/sessionRow/.test(a))||B(l,"sessionRow"),"selected"),archived:B(H(u).find(a=>/sessionRow/.test(a))||B(l,"sessionRow"),"archived"),sessionSlot:k(c?.querySelector('[class*="slot"]'))||B(l,"slot"),sessionTitle:k(c?.querySelector('[class*="title"]'))||B(l,"title"),resting:k(c?.querySelector('[class*="Resting"]'))||B(l,"rowResting"),time:k(c?.querySelector('[class*="time"]'))||B(l,"time")}}function kn(){let[e,s]=se(null);return Le(()=>{let t=0,n=0,m=()=>{let r=xn();if(r){s(r);return}++t>40||(n=window.setTimeout(m,50))};return m(),()=>window.clearTimeout(n)},[]),e}function Sn({label:e}){return p("div",{className:"nsw-bone-header",role:"status","aria-busy":"true","aria-label":e},p("span",{className:"nsw-bone nsw-bone-label"}))}var pe=(e,s,t,n)=>p("button",{type:"button",className:n,title:e,"aria-label":e,...t},s);function Pe({face:e,wide:s}){let t=e.copy(),[n,m]=se(e.settings.current),[r,d]=se(()=>e.currentSessionId?.()??null),[S,b]=se(!1),[N,C]=se(0),j=yn(null),i=kn();Le(()=>e.settings.subscribe(m),[]),je(()=>e.subscribeSession?.(d),[]);let E=n?.listReady===!0,v=E&&n?.sectionOpen===!0;if(je(()=>{let x=j.current;if(x==null)return;if(!v){C(0);return}let A=x.firstElementChild?.scrollHeight??0;C(A)},[v,S,n?.sharedWorkspaces,n?.sessions,n?.expanded]),!s)return p("div",{className:"nsw-rail",role:"complementary","aria-label":t.railTitle},p("button",{type:"button",className:"nsw-rail-button",title:t.railTitle,"aria-label":t.railTitle,onClick:e.onToggleRail},p(g.IconGlobeOutlineRegular,{size:16})));if(i==null)return p(Sn,{label:t.sectionLoading});let o=n?.expandLimit??3,l=n?.configured===!0,c=n?.username,u=n?.viewFilter??"all",y=n?.expanded??{},a=n?.sessions??[],f=(n?.sharedWorkspaces??[]).filter(x=>u!=="mine"||Object.values(x?.members??{}).some(A=>A?.username===c)),h=x=>a.filter(A=>A.workspaceId===x),L=p("div",{className:i.actions},pe(t.viewOptions,p(g.IconSlidersTwoOutlineRegular,{size:16}),{"aria-haspopup":"menu","data-nsw-view-options":!0,onClick:e.onViewOptions},i.button),pe(t.addWorkspace,p(g.IconProjectAddOutlineRegular,{size:16}),{onClick:e.onCreateWorkspace},i.button)),O=i.template.map((x,A)=>{if(x.slot==="label")return p("span",{key:A,className:`${x.cls} nsw-label-with-expand`},t.title,p("button",{type:"button",className:`${i.button} nsw-expand`,title:v?t.collapseSection:t.expandSection,"aria-label":v?t.collapseSection:t.expandSection,"aria-expanded":v,disabled:!E,onClick:e.onToggleSection},p(g.IconTriangleRightFillRegular,{className:v?`${i.arrow} ${i.arrowOpen}`:i.arrow})));if(x.slot==="search"){let ce=!E||n?.syncing===!0,J=pe(t.refresh,p(g.IconRefreshOutlineRegular,{size:14,className:ce?"nsw-spin":void 0}),{onClick:e.onRefresh},i.searchButton);return p("div",{key:A,className:x.cls},i.search?p("div",{className:i.search},J):J)}return x.slot==="actions"?ie.default.cloneElement(L,{key:A,className:x.cls}):p("div",{key:A,className:x.cls})}),_=f.map(x=>{let A=Object.values(x?.members??{}).some(R=>R?.username===c),ce=h(x.workspaceId),J=y[x.workspaceId]===!0,Se=new Set(n?.pinnedSessionIds??[]),ve=new Set(n?.archivedSessionIds??[]),cn=[...ce].sort((R,ne)=>{let q=re=>ve.has(re.sessionId)?2:Se.has(re.sessionId)?0:1;return q(R)-q(ne)}),Ne=J?cn.map(R=>{let ne=Se.has(R.sessionId),q=ve.has(R.sessionId),re=n?.sessionsReady!==!0||n?.pulling?.[x.workspaceId]===!0;return p("div",{role:"treeitem",key:R.sessionId,className:[i.sessionRow,R.sessionId===r&&i.selected?i.selected:"",q&&i.archived?i.archived:""].filter(Boolean).join(" "),"aria-selected":R.sessionId===r,title:R.mtime??"",onClick:()=>{q||e.onOpenSession?.(R)}},p("span",{className:i.sessionSlot}),p("span",{className:i.sessionTitle,onDoubleClick:Y=>{Y.stopPropagation(),e.onRenameSession?.(R)}},R.title||R.sessionId),p("span",{className:i.resting},ne&&!q?p(g.IconPinFillRegular,{size:14}):null,p("span",{className:i.time},R.writerName??"")),p("span",{className:i.rowActions,onClick:Y=>Y.stopPropagation()},re||i.rowButton===""?null:p(ie.default.Fragment,null,p("button",{type:"button",className:i.rowButton,"aria-label":q?t.unarchiveSession:t.archiveSession,onClick:Y=>{Y.stopPropagation(),e.onToggleArchive?.(R)}},p(q?g.IconUnarchiveOutlineRegular:g.IconArchiveOutlineRegular,{size:14})),p("button",{type:"button",className:i.rowButton,"aria-label":ne?t.unpinSession:t.pinSession,onClick:Y=>{Y.stopPropagation(),e.onTogglePin?.(R)}},p(ne?g.IconPinFillRegular:g.IconPinOutlineRegular,{size:14})))))}):[];return p("div",{key:x.workspaceId,className:i.group},p("div",{role:"treeitem",className:i.row,"data-nsw-loading":n?.sessionsReady!==!0||n?.pulling?.[x.workspaceId]===!0?"true":void 0,"aria-expanded":J,onClick:()=>A?e.onToggleWorkspace?.(x.workspaceId):e.onJoinWorkspace?.(x.workspaceId)},p("span",{className:i.folder},p(J?g.IconFolderOpenRegular:g.IconFolderCloseRegular)),p("span",{className:i.chevron},p(g.IconTriangleRightFillRegular,{className:J?`${i.arrow} ${i.arrowOpen}`:i.arrow})),p("span",{className:i.projectText},p("span",{className:i.title},x?.title??x?.workspaceId)),A?null:p("span",{className:i.time},t.stateIdle),p("span",{className:i.rowActions,onClick:R=>R.stopPropagation()},n?.sessionsReady!==!0||n?.pulling?.[x.workspaceId]===!0?p("span",{className:i.rowButton,role:"status","aria-label":t.sectionLoading},p(g.IconRefreshOutlineRegular,{size:14,className:"nsw-spin"})):A&&i.rowButton!==""?p("button",{type:"button",className:i.rowButton,"aria-label":t.newSession,onClick:R=>{R.stopPropagation(),e.onCreateSession?.(x.workspaceId)}},p(g.IconNewChatOutlineRegular,{size:14})):null)),Ne.length>0?p("div",{role:"group"},Ne):null)}),oe=l===!0,Z=n?.sessionsReady!==!0||Object.keys(n?.pulling??{}).length>0,W=f.length===0?p("div",{className:i.group},p("div",{role:"button",className:i.row,"data-nsw-loading":Z?"true":void 0,onClick:()=>{Z||e.onCreateWorkspace?.()}},p("span",{className:H(i.folder).filter(x=>!/folder/i.test(x)).join(" ")||i.sessionSlot},Z?p(g.IconRefreshOutlineRegular,{size:16,className:"nsw-spin"}):p(oe?g.IconProjectAddOutlineRegular:g.IconDatabaseOutlineRegular,{size:16})),p("span",{className:i.projectText},p("span",{className:i.title},Z?t.sectionLoading:oe?t.emptyHint:t.bindEmptyHint)))):null,ye=S?_:_.slice(0,o),xe=_.length-ye.length,an=xe>0?p("button",{type:"button",key:"more",className:"nsw-more",onClick:()=>b(!0)},t.showMore.replace("{n}",String(xe))):null,ke=p("div",{className:i.list,role:"tree"},ye,an,_.length===0?W:null),ln=i.treeBody?p("div",{className:i.treeBody},ke):ke;return p("div",{className:`nsw-root ${i.root}`,role:"complementary","aria-label":t.title},p("div",{className:i.header},...O),p("div",{ref:j,className:"nsw-reveal","data-open":v?"true":"false",style:v?{maxHeight:N}:void 0},p("div",{className:"nsw-reveal-inner"},p("div",{className:i.listArea},ln))))}var Ye=K(D("react"),1);var $=D("@deepseek-ai/dsh-client-ui-primitives");var vn="/nano-shared-workspace";async function P(e,s){let t=await fetch(`${vn}${e}`,{credentials:"same-origin",cache:"no-store",...s}),n=await t.json().catch(()=>({}));if(!t.ok)throw new Error(typeof n?.error=="string"?n.error:`HTTP ${t.status}`);return n}var De=()=>P("/settings"),Ae=()=>P("/status");function We({username:e,token:s,accessKey:t}){return P("/settings/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:e,token:s,accessKey:t})}).then(n=>{if(n?.ok!==!0)throw new Error(n?.error??"bucket probe failed");return n})}function ze({username:e,token:s,accessKey:t}){return P("/settings/update",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({username:e,token:s,accessKey:t})})}var Be=()=>P("/workspaces");function $e(e,s){return P("/workspaces/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:e,localPath:s})})}function Fe(e,s){return P("/workspaces/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,localPath:s})})}var le=()=>P("/sync",{method:"POST"});function He(e,s){return P("/mkdir",{method:"POST",body:JSON.stringify({parent:e,name:s})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"mkdir failed");return t.path})}var qe=e=>P("/ls",{method:"POST",body:JSON.stringify(e===void 0?{}:{path:e})}),Ke=()=>P("/sessions");function ue(e){return P("/tree/pull",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e})}).then(s=>{if(s?.ok!==!0)throw new Error(s?.error??"pull failed");return s})}function Me(e,s){return P("/sessions/bind",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({path:e,sessionId:s})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"bind failed");return t})}function me(e,s){return P("/sessions/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})}).then(t=>{if(t?.busy===!0)return t;if(t?.ok!==!0)throw new Error(t?.error??"claim failed");return t})}function _e(e,s){return P("/sessions/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})})}function Je(e,s){return P("/materialize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId:e,sessionId:s})}).then(t=>{if(t?.ok!==!0)throw new Error(t?.error??"materialize failed");return t})}var{createElement:w,useState:ee}=Ye.default;function he({label:e,children:s}){return w("label",{className:"nsw-field"},w("span",{className:"nsw-field-label"},e),s)}function Ue({face:e,settings:s,stage:t="bind",onBound:n,onOpenCreate:m}){let r=e.copy(),[d,S]=ee(s?.username??""),[b,N]=ee(""),[C,j]=ee(""),[i,E]=ee(!1),[v,o]=ee("idle"),[l,c]=ee(void 0),u=d.trim(),y=b.trim(),a=C.trim(),f=s?.configured===!0,h=u!==""&&!i&&(f||y!==""&&a!==""),L=async()=>{if(u===""){c(r.usernameRequired);return}if(y===""!=(a==="")){c(r.keysRequired);return}if(!f&&y===""){c(r.keysRequired);return}E(!0),c(void 0),o("probe");try{await We({username:u,token:a===""?void 0:a,accessKey:y===""?void 0:y}),o("save"),await ze({username:u,token:a===""?void 0:a,accessKey:y===""?void 0:y}),E(!1),o("done"),n?.({username:u})}catch(W){o("idle"),E(!1),c(`${r.bindFailed}: ${W instanceof Error?W.message:String(W)}`)}},O=v==="probe",_=v==="save",oe=w("span",{className:"nsw-stage-title"},w($.IconLinkOutlineRegular,{size:16}),w("span",null,r.bindStage)),Z=w("span",{className:"nsw-stage-title"},w($.IconDatabaseOutlineRegular,{size:16}),w("span",null,r.workspaceStage));return t==="workspace"?w(z,{copy:r,title:Z,description:r.workspaceStageDescription,confirmLabel:r.newWorkspace,width:420,onConfirm:()=>{e.settings.close(),m?.()},onCancel:e.settings.close},w("div",{className:"nsw-stage-done",role:"status"},w($.IconLinkOutlineRegular,{size:16}),w("span",null,r.bindSucceeded.replace("{bucket}",s?.bucket??""))),w("p",{className:"nsw-join-hint"},r.workspaceStageHint)):w(z,{copy:r,title:oe,description:r.bindStageDescription,confirmLabel:O||_?r.binding:r.bindConfirm,confirmDisabled:!h,busy:i,error:l,width:420,onConfirm:L,onCancel:e.settings.close},w("div",{className:"nsw-endpoint"},w("span",{className:"nsw-endpoint-row nsw-identity"},w("span",{className:"nsw-endpoint-key"},r.status),w("span",{className:"nsw-identity-value"},f?`${r.configured} \xB7 ${s.username??"\u2014"}`:r.unconfigured)),w("span",{className:"nsw-endpoint-row"},w("span",{className:"nsw-endpoint-key"},r.endpointLabel),w("code",{className:"nsw-endpoint-value"},s?.endpoint??"\u2014")),w("span",{className:"nsw-endpoint-row"},w("span",{className:"nsw-endpoint-key"},r.bucketLabel),w("code",{className:"nsw-endpoint-value"},s?.bucket??"\u2014"))),w(he,{label:r.username},w($.Input,{value:d,placeholder:r.usernamePlaceholder,"data-modal-autofocus":!0,onChange:W=>S(W.currentTarget.value)})),w(he,{label:r.accessKey},w($.Input,{value:b,placeholder:f?r.secretKeep:r.accessKeyPlaceholder,autoComplete:"off",onChange:W=>N(W.currentTarget.value)})),w(he,{label:r.secretKey},w($.Input,{type:"password",value:C,placeholder:f?r.secretKeep:r.secretKeyPlaceholder,autoComplete:"new-password",onChange:W=>j(W.currentTarget.value)})),O||_?w("div",{className:"nsw-probe",role:"status","aria-live":"polite"},w("span",{className:"nsw-probe-dot"}),w("span",null,O?r.probingBucket:r.bindSaving)):null,w("div",{className:"nsw-switch-row"},w("span",null,w("span",{className:"nsw-field-label"},r.expandOnLoad),w("span",{className:"nsw-join-hint"},r.expandOnLoadHint)),w($.Switch,{checked:s?.expandOnLoad!==!1,label:r.expandOnLoad,onChange:W=>e.setExpandOnLoad(W)})),w("p",{className:"nsw-join-hint"},r.joinHint))}var Ve=K(D("react"),1);var{createElement:G}=Ve.default;function Nn(e){let s=e?.data??{};if(e?.type==="user/message")return{role:"user",text:(s.content??[]).filter(n=>n?.type==="text").map(n=>n.text).join(`
`)};if(e?.type==="assistant/message"){let t=(s.message?.content??[]).filter(m=>m?.type==="text").map(m=>m.text).join(`
`);return{role:"assistant",text:[(s.message?.content??[]).filter(m=>m?.type==="reasoning").map(m=>m.text).join(`
`),t].filter(Boolean).join(`

`)}}return e?.type==="tool/call"?{role:"tool",text:`${s.name??s.tool??"tool"} ${JSON.stringify(s.input??s.args??{}).slice(0,160)}`}:null}function Ge({face:e,transcript:s}){let t=e.copy(),n=s?.events??[],m=n.map(Nn).filter(r=>r!==null&&r.text.trim()!=="");return G(z,{copy:t,title:s?.meta?.title??t.transcriptFallback,confirmLabel:t.closeLabel??"Close",onConfirm:e.onCloseTranscript,onCancel:e.onCloseTranscript},G("div",{className:"nsw-transcript-meta"},`${s?.meta?.writerName??"?"} \xB7 ${s?.meta?.mtime??""} \xB7 ${n.length} events \xB7 ${s?.meta?.committedBytes??0}B`),G("div",{className:"nsw-transcript-body"},m.length===0?G("p",{className:"nsw-notice"},t.transcriptEmpty):m.map((r,d)=>G("div",{key:d,className:`nsw-transcript-row nsw-role-${r.role}`},G("span",{className:"nsw-transcript-role"},t[`role_${r.role}`]??r.role),G("span",{className:"nsw-transcript-text"},r.text)))))}var fe=K(D("react"),1);var{createElement:I,useEffect:Cn,useRef:En,useState:X}=fe.default;function Xe({face:e,mode:s,workspaceId:t}){let n=e.copy(),[m,r]=X(""),[d,S]=X(null),[b,N]=X(null),[C,j]=X(!1),[i,E]=X(""),[v,o]=X(!1),[l,c]=X(null),u=En(0),y=h=>{let L=++u.current;o(!0),e.listDirectory(h).then(O=>{u.current===L&&S(O)}).catch(O=>c(O instanceof Error?O.message:String(O))).finally(()=>{u.current===L&&o(!1)})};Cn(()=>{y(void 0)},[]);let a=h=>{o(!0),(s==="join"?e.joinWorkspace(t,h):e.createWorkspace(m.trim(),h)).then(()=>e.onCloseCreateDialog?.(!0)).catch(O=>c(`${n.createFailed}: ${O instanceof Error?O.message:String(O)}`)).finally(()=>o(!1))},f=s==="join"||m.trim()!=="";return I(z,{copy:n,title:s==="join"?n.pickReplicaTitle:n.createTitle,confirmLabel:s==="join"?n.joinHere:n.createHere,confirmDisabled:!f||v||d===null,busy:v,onConfirm:()=>a(b??d?.path),onCancel:()=>e.onCloseCreateDialog?.(!1)},I("div",{className:"nsw-create-body"},s==="create"?I("label",{className:"nsw-field"},I("span",{className:"nsw-field-label"},n.workspaceName),I("input",{className:"nsw-input",value:m,onChange:h=>r(h.target.value),placeholder:n.workspaceNameHint})):null,I("p",{className:"nsw-field-label"},n.pickReplicaHint),I("div",{className:"nsw-crumbs"},(d?.crumbs??[]).map((h,L)=>I(fe.default.Fragment,{key:h.path},L>0?I("span",{className:"nsw-crumb-sep"},"/"):null,I("button",{type:"button",className:"nsw-crumb",onClick:()=>y(h.path)},h.name===""?"/":h.name)))),I("div",{className:"nsw-entries"},v&&d===null?I("p",{className:"nsw-notice"},n.loading):null,(d?.entries??[]).filter(h=>!h.hidden).map(h=>I("button",{type:"button",key:h.path,className:`nsw-entry${b===h.path?" nsw-entry-selected":""}`,onClick:()=>N(h.path),onDoubleClick:()=>y(h.path)},h.name)),d!==null&&(d.entries??[]).filter(h=>!h.hidden).length===0?I("p",{className:"nsw-notice"},n.emptyDir):null),C?I("div",{className:"nsw-new-folder"},I("input",{className:"nsw-input",value:i,onChange:h=>E(h.target.value),placeholder:n.newFolder}),I("button",{type:"button",className:"nsw-button",disabled:i.trim()===""||v,onClick:()=>{o(!0),e.createDirectory(d.path,i.trim()).then(h=>{j(!1),E(""),N(h),y(d.path)}).catch(h=>c(h instanceof Error?h.message:String(h))).finally(()=>o(!1))}},n.createFolder)):I("button",{type:"button",className:"nsw-link-button",onClick:()=>j(!0)},`\uFF0B ${n.newFolder}`),l!==null?I("p",{className:"nsw-notice"},l):null))}var Qe="data-nano-shared-workspace";function Rn(){return document.querySelector('[role="tree"]')}function en(){let e=Rn();for(;e!==null&&e!==document.body;){let s=e.parentElement;if(s!==null&&s.querySelector(":scope > nav")!==null)return e;e=s}for(let s of document.querySelectorAll("nav")){if(s.parentElement===null)continue;let n=s.nextElementSibling;if(n!==null&&n.tagName==="DIV"&&n.querySelector("nav")===null)return n}return null}function we(){let e=en();return e===null?!0:e.getBoundingClientRect().width>80}function ge(){let e=en();if(e===null)return null;let s=e.querySelector(`[${Qe}]`);return s===null?(s=document.createElement("div"),s.setAttribute(Qe,""),s.className="nsw-graft",e.prepend(s)):s!==e.firstElementChild&&e.prepend(s),s}function On({face:e,rename:s}){let t=e.copy(),[n,m]=T.default.useState(s?.title??""),[r,d]=T.default.useState(void 0),[S,b]=T.default.useState(!1),N=async()=>{b(!0),d(void 0);try{await e.confirmRename(n)}catch(C){d(C instanceof Error?C.message:String(C)),b(!1)}};return T.default.createElement(z,{copy:t,title:t.renameSessionTitle,confirmLabel:t.renameSession,confirmDisabled:n.trim()===""||S,busy:S,error:r,onConfirm:N,onCancel:e.cancelRename},T.default.createElement(Ze.Input,{value:n,"data-modal-autofocus":!0,onChange:C=>m(C.currentTarget.value)}))}function nn({face:e,renderSlot:s}){let[t,n]=T.default.useState(()=>ge()),[m,r]=T.default.useState(()=>we()),[d,S]=T.default.useState(e.settings.current);return T.default.useEffect(()=>e.settings.subscribe(S),[]),T.default.useEffect(()=>{let b=new MutationObserver(()=>{n(ge()),r(we())});return b.observe(document.body,{childList:!0,subtree:!0,attributes:!0}),n(ge()),r(we()),()=>{b.disconnect(),t?.remove()}},[]),t===null?null:T.default.createElement(T.default.Fragment,null,(0,Q.createPortal)(T.default.createElement(Pe,{face:e,wide:m}),t),d?.open===!0?(0,Q.createPortal)(T.default.createElement(Ue,{face:e,settings:d,stage:d.setupStage==="workspace"?"workspace":"bind",onBound:()=>{e.finishBind?.()},onOpenCreate:()=>{e.onCreateWorkspace?.()}}),document.body):null,d?.transcript!=null?(0,Q.createPortal)(T.default.createElement(Ge,{face:e,transcript:d.transcript}),document.body):null,typeof d?.notice=="string"&&d.notice!==""?(0,Q.createPortal)(T.default.createElement(z,{copy:e.copy(),title:e.copy().noticeTitle,confirmLabel:e.copy().closeLabel,onConfirm:e.dismissNotice,onCancel:e.dismissNotice},d.notice),document.body):null,d?.rename!=null?(0,Q.createPortal)(T.default.createElement(On,{face:e,rename:d.rename}),document.body):null,d?.createDialog!=null?(0,Q.createPortal)(T.default.createElement(Xe,{face:e,mode:d.createDialog.mode,workspaceId:d.createDialog.workspaceId}),document.body):null)}var tn={zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A",railTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A",settings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",viewOptions:"\u89C6\u56FE\u9009\u9879",addWorkspace:"\u6DFB\u52A0\u5171\u4EAB\u5DE5\u4F5C\u533A",filterAll:"\u5168\u90E8\u5171\u4EAB\u5DE5\u4F5C\u533A",filterMine:"\u53EA\u770B\u6211\u52A0\u5165\u7684",createFailed:"\u521B\u5EFA\u5DE5\u4F5C\u533A\u5931\u8D25",enterFailed:"\u65E0\u6CD5\u8FDB\u5165\u8FD9\u4E2A\u5171\u4EAB\u5DE5\u4F5C\u533A",pullFailed:"\u65E0\u6CD5\u4ECE\u5171\u4EAB\u7A7A\u95F4\u8F7D\u5165\u8FD9\u4E2A\u4F1A\u8BDD",noticeTitle:"\u65E0\u6CD5\u6253\u5F00",workspaceAddLocal:"\u6DFB\u52A0\u5DE5\u4F5C\u533A",creating:"\u6B63\u5728\u521B\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A\u2026",syncPushed:"\u5DF2\u63A8\u9001",transcriptFallback:"\u8FDC\u7A0B\u4F1A\u8BDD",transcriptEmpty:"\u8BE5\u4F1A\u8BDD\u6682\u65E0\u53EF\u8BFB\u5185\u5BB9",transcriptFailed:"\u8BFB\u53D6\u4F1A\u8BDD\u5931\u8D25",role_user:"\u7528\u6237",role_assistant:"\u52A9\u624B",role_tool:"\u5DE5\u5177",createTitle:"\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",pickReplicaTitle:"\u52A0\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",workspaceName:"\u5DE5\u4F5C\u533A\u540D\u79F0",workspaceNameHint:"\u4F8B\u5982 team-portal",pickReplicaHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u5B58\u653E\u4F4D\u7F6E\uFF08\u4E91\u7AEF\u624D\u662F\u771F\u6E90\uFF09",loading:"\u52A0\u8F7D\u76EE\u5F55\u2026",emptyDir:"\u8BE5\u76EE\u5F55\u4E3A\u7A7A",newFolder:"\u65B0\u5EFA\u6587\u4EF6\u5939",createFolder:"\u521B\u5EFA",createHere:"\u521B\u5EFA\u5230\u6B64\u76EE\u5F55",joinHere:"\u52A0\u5165\u5230\u6B64\u76EE\u5F55",joinHint:"\u9009\u62E9\u672C\u5730\u526F\u672C\u4F4D\u7F6E\u4EE5\u52A0\u5165",readOnlyBusy:"\u53EA\u8BFB\uFF1A{holder} \u6B63\u5728\u5199\u8FD9\u6761\u4F1A\u8BDD\uFF0C\u79DF\u7EA6\u7ED3\u675F\u524D\u4E0D\u80FD\u5360\u7528",closeLabel:"\u5173\u95ED",settingsTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A\u8BBE\u7F6E",settingsDescription:"\u8EAB\u4EFD\u5199\u5165\u51ED\u636E\u5B58\u50A8\uFF1BS3 \u771F\u6E90\u7AEF\u70B9\u5728\u670D\u52A1\u7AEF\u914D\u7F6E\u4E2D\u56FA\u5B9A\u3002",username:"\u7528\u6237\u540D",usernamePlaceholder:"\u5728\u5171\u4EAB\u7A7A\u95F4\u663E\u793A\u7684\u540D\u5B57",bindStage:"\u7B2C 1 \u6B65 \xB7 \u7ED1\u5B9A\u6587\u4EF6\u6876",bindStageDescription:"\u586B\u5199\u8EAB\u4EFD\u548C\u5BC6\u94A5\uFF0C\u5148\u771F\u5B9E\u63A2\u6D4B\u4E00\u6B21\u5B58\u50A8\u6876\uFF1B\u63A2\u6D4B\u901A\u8FC7\u624D\u4F1A\u8FDB\u5165\u4E0B\u4E00\u6B65\u3002",workspaceStage:"\u7B2C 2 \u6B65 \xB7 \u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",workspaceStageDescription:"\u6587\u4EF6\u6876\u5DF2\u7ED1\u5B9A\u3002\u73B0\u5728\u5728\u8FDC\u7AEF\u521B\u5EFA\u7B2C\u4E00\u4E2A\u5171\u4EAB\u5DE5\u4F5C\u533A\u3002",workspaceStageHint:"\u8DF3\u8FC7\u4E5F\u53EF\u4EE5\uFF0C\u4E4B\u540E\u5728\u4FA7\u680F\u70B9\u300C\u8BF7\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A\u300D\u3002",bindConfirm:"\u7ED1\u5B9A\u6587\u4EF6\u6876",binding:"\u6B63\u5728\u7ED1\u5B9A\u2026",probingBucket:"\u6B63\u5728\u63A2\u6D4B\u6587\u4EF6\u6876\uFF0C\u8BF7\u7A0D\u5019\u2026",bindSaving:"\u63A2\u6D4B\u901A\u8FC7\uFF0C\u6B63\u5728\u4FDD\u5B58\u2026",bindFailed:"\u7ED1\u5B9A\u6587\u4EF6\u6876\u5931\u8D25",bindSucceeded:"\u5DF2\u7ED1\u5B9A\u6587\u4EF6\u6876 {bucket}",newWorkspace:"\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",accessKey:"Access Key",accessKeyPlaceholder:"S3_DEV_ACCESS_KEY \u6216 S3_PROD_ACCESS_KEY",secretKey:"Secret Key",secretKeyPlaceholder:"\u5BF9\u5E94\u7684 SECRET_KEY",secretKeep:"\u5DF2\u914D\u7F6E\uFF0C\u7559\u7A7A\u5219\u4E0D\u4FEE\u6539",keysRequired:"Access Key \u548C Secret Key \u90FD\u8981\u586B",endpointLabel:"\u7AEF\u70B9",bucketLabel:"\u5B58\u50A8\u6876",status:"\u72B6\u6001",configured:"\u5DF2\u914D\u7F6E",unconfigured:"\u672A\u914D\u7F6E",emptyHint:"\u8BF7\u65B0\u5EFA\u5171\u4EAB\u5DE5\u4F5C\u533A",bindEmptyHint:"\u8BF7\u5148\u7ED1\u5B9A\u6587\u4EF6\u6876",sectionLoading:"\u6B63\u5728\u8F7D\u5165\u5171\u4EAB\u5DE5\u4F5C\u533A",newSession:"\u65B0\u5EFA\u4F1A\u8BDD",renameSession:"\u91CD\u547D\u540D",renameSessionTitle:"\u91CD\u547D\u540D\u4F1A\u8BDD",pinSession:"\u7F6E\u9876",unpinSession:"\u53D6\u6D88\u7F6E\u9876",archiveSession:"\u5F52\u6863",unarchiveSession:"\u53D6\u6D88\u5F52\u6863",expandSection:"\u5C55\u5F00\u5171\u4EAB\u5DE5\u4F5C\u533A",collapseSection:"\u6536\u8D77\u5171\u4EAB\u5DE5\u4F5C\u533A",showMore:"\u5C55\u5F00\u5176\u4F59 {n} \u4E2A",expandOnLoad:"\u52A0\u8F7D\u5B8C\u6210\u540E\u5C55\u5F00\u5DE5\u4F5C\u533A",expandOnLoadHint:"\u9ED8\u8BA4\u5C55\u5F00\u524D 3 \u4E2A\uFF0C\u5176\u4F59\u6536\u8D77\uFF0C\u53EF\u518D\u624B\u52A8\u5C55\u5F00\u3002",stateJoined:"\u5DF2\u52A0\u5165",stateIdle:"\u672A\u52A0\u5165",usernameRequired:"\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A",tokenRequired:"Access Key \u548C Secret Key \u90FD\u8981\u586B",saved:"\u5DF2\u4FDD\u5B58",clear:"\u6E05\u9664",clearTitle:"\u6E05\u9664\u5171\u4EAB\u51ED\u636E",clearBody:"\u5220\u9664\u672C\u673A\u4FDD\u5B58\u7684\u7528\u6237\u540D\u548C MinIO Token\uFF0C\u5E76\u65AD\u5F00\u5171\u4EAB\u7A7A\u95F4\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",cancel:"\u53D6\u6D88",confirm:"\u4FDD\u5B58",close:"\u5173\u95ED",save:"\u4FDD\u5B58",joinHint:"\u591A\u53F0\u5BA2\u6237\u7AEF\u4F7F\u7528\u540C\u4E00\u7528\u6237\u540D\u548C\u540C\u4E00\u5BF9\u5BC6\u94A5\uFF0C\u5373\u89C6\u4E3A\u540C\u4E00\u8EAB\u4EFD\u3002",errorLoad:"\u8BFB\u53D6\u8BBE\u7F6E\u5931\u8D25",errorSave:"\u4FDD\u5B58\u5931\u8D25"},en:{title:"Shared Workspace",railTitle:"Shared Workspace",settings:"Settings",refresh:"Refresh",viewOptions:"View options",addWorkspace:"Add shared workspace",filterAll:"All shared workspaces",filterMine:"Only ones I joined",createFailed:"Failed to create workspace",enterFailed:"Could not open this shared workspace",pullFailed:"Could not load this session from the shared space",noticeTitle:"Could not open",workspaceAddLocal:"Add workspace",creating:"Creating shared workspace\u2026",syncPushed:"Pushed",transcriptFallback:"Remote session",transcriptEmpty:"Nothing readable in this session yet",transcriptFailed:"Failed to read session",role_user:"User",role_assistant:"Assistant",role_tool:"Tool",createTitle:"New shared workspace",pickReplicaTitle:"Join shared workspace",workspaceName:"Workspace name",workspaceNameHint:"e.g. team-portal",pickReplicaHint:"Pick the local replica location (the cloud is canonical)",loading:"Loading directory\u2026",emptyDir:"This directory is empty",newFolder:"New folder",createFolder:"Create",createHere:"Create here",joinHere:"Join here",joinHint:"Pick a local replica location to join",readOnlyBusy:"Read-only: {holder} holds this session until the lease expires",closeLabel:"Close",settingsTitle:"Shared Workspace Settings",settingsDescription:"Identity is stored in the credential store; the S3 source of truth is fixed in server config.",username:"Username",usernamePlaceholder:"Name shown in the shared space",bindStage:"Step 1 \xB7 Bind the bucket",bindStageDescription:"Enter the identity and keys; the bucket is probed with a real request before continuing.",workspaceStage:"Step 2 \xB7 Create a shared workspace",workspaceStageDescription:"The bucket is bound. Create the first shared workspace on the remote.",workspaceStageHint:'You can skip this and use "Create a shared workspace" in the sidebar later.',bindConfirm:"Bind bucket",binding:"Binding\u2026",probingBucket:"Probing the bucket\u2026",bindSaving:"Probe passed, saving\u2026",bindFailed:"Bucket bind failed",bindSucceeded:"Bound the bucket {bucket}",newWorkspace:"Create a shared workspace",accessKey:"Access Key",accessKeyPlaceholder:"S3_DEV_ACCESS_KEY or S3_PROD_ACCESS_KEY",secretKey:"Secret Key",secretKeyPlaceholder:"The matching SECRET_KEY",secretKeep:"Configured. Leave blank to keep the saved keys",keysRequired:"Both Access Key and Secret Key are required",endpointLabel:"Endpoint",bucketLabel:"Bucket",status:"Status",configured:"Configured",unconfigured:"Not configured",emptyHint:"Create a shared workspace",bindEmptyHint:"Bind a bucket first",sectionLoading:"Loading shared workspaces",newSession:"New session",renameSession:"Rename",renameSessionTitle:"Rename session",pinSession:"Pin",unpinSession:"Unpin",archiveSession:"Archive",unarchiveSession:"Unarchive",expandSection:"Expand shared workspaces",collapseSection:"Collapse shared workspaces",showMore:"Show {n} more",expandOnLoad:"Expand after loading",expandOnLoadHint:"Shows the first 3, and keeps the rest collapsed until you ask.",stateJoined:"Joined",stateIdle:"Not joined",usernameRequired:"Username is required",tokenRequired:"Both Access Key and Secret Key are required",saved:"Saved",clear:"Clear",clearTitle:"Clear shared credentials",clearBody:"Remove the locally stored username and MinIO token and leave the shared space. This cannot be undone.",cancel:"Cancel",confirm:"Save",close:"Close",save:"Save",joinHint:"Clients that share a username and the same key pair count as one identity.",errorLoad:"Failed to load settings",errorSave:"Failed to save"}},F=e=>tn[e==="zh"?"zh":"en"]??tn.en;var sn=`
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
/* The row hides its actions until hover, so the spinner forces the strip visible.
   The native 24px target sits 5px left of the 16px header glyph; pull it back
   so the 14px spinner shares that glyph's right edge. */
[data-nsw-loading="true"] [class*="rowActions"] {
  display: inline-flex;
  margin-right: -5px;
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
.nsw-stage-title { display: inline-flex; align-items: center; gap: 8px; }
.nsw-stage-done { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--dsw-alias-label-secondary, #aaa); font-size: 12.5px; }
.nsw-probe { display: flex; align-items: center; gap: 8px; margin: 2px 0 10px; font-size: 12.5px; color: var(--dsw-alias-label-secondary, #aaa); }
.nsw-probe-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-state-business-primary, #4a9eff); animation: nsw-heartbeat 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .nsw-probe-dot { animation: none; } }
.nsw-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 4px 0 12px; }
.nsw-switch-row .nsw-join-hint { display: block; margin: 2px 0 0; }
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
`;var In=["slots","locale","layout","uiWorkspace","workspaces","sessions"],Tn="nanoSharedWorkspace",on="nsw-section-prefs",be=3;function rn(){try{return{expandOnLoad:JSON.parse(localStorage.getItem(on)||"")?.expandOnLoad!==!1,expandLimit:be}}catch{return{expandOnLoad:!0,expandLimit:be}}}function jn(){let e={open:!1,loaded:!1,configured:!1,username:null,sessionsReady:!1,pulling:{},...rn()},s=new Set,t=()=>{for(let n of s)n()};return{get current(){return e},set(n){e={...e,...n},t()},subscribe:n=>(s.add(n),()=>s.delete(n))}}function Ln(e){let s=document.createElement("style");s.dataset.nswStyle="true",s.textContent=sn,document.head.append(s),e.effect(()=>()=>s.remove());let t=()=>e.locale.getSnapshot().active,n=jn(),m=(o,l)=>Object.values(o?.members??{}).find(c=>c?.username===l)?.localPath??"",r=()=>{let o=document.querySelector("[data-nano-shared-workspace]"),l=n.current.username,c=new Set;for(let a of n.current.sharedWorkspaces??[]){let f=m(a,l);f&&c.add(f.replace(/\/+$/,""))}let u=new Set([...(n.current.sessions??[]).map(a=>a.sessionId),...n.current.ownedSessionIds??[]]),y=new Set((e.workspaces.list.getSnapshot().items??[]).filter(a=>c.has(a.path?.replace(/\/+$/,""))).map(a=>a.workspaceId));for(let a of document.querySelectorAll('[data-row-key^="workspace:"]')){if(o?.contains(a))continue;let f=a.getAttribute("data-row-key").slice(10),h=a.closest('[class*="groupSection"]')??a,L=y.has(f);h.hidden!==L&&(h.hidden=L)}for(let a of document.querySelectorAll('[data-row-key^="session:"]')){if(o?.contains(a))continue;let f=a.getAttribute("data-row-key").slice(8),h=u.has(f);a.hidden!==h&&(a.hidden=h)}for(let a of document.querySelectorAll('[data-row-key="workspace:"]')){if(o?.contains(a))continue;let f=a.closest('[class*="groupSection"]')??a.parentElement;if(f==null)continue;let h=[...f.querySelectorAll('[data-row-key^="session:"]')],L=h.length>0&&h.every(O=>O.hidden);f.hidden!==L&&(f.hidden=L)}},d=()=>{De().then(o=>(n.set({...o,loaded:!0}),Be().then(l=>{let c=l.workspaces??[],u=n.current.listReady!==!0;n.set({sharedWorkspaces:c,listReady:!0,...u?{sectionOpen:rn().expandOnLoad}:{}}),r()}).catch(()=>n.set({listReady:!0,...n.current.listReady!==!0?{sectionOpen:!1}:{}})))).catch(()=>n.set({loaded:!0,listReady:!0})),Ae().catch(()=>{}),Ke().then(o=>{n.set({sessions:o.sessions??[],sessionsReady:!0}),r()}).catch(()=>n.set({sessionsReady:!0}))},S=()=>{let o=e.workspaces.list.getSnapshot();n.set({pinnedSessionIds:[...o.pinnedSessionIds??[]],archivedSessionIds:[...o.archivedSessionIds??[]]})};typeof e.workspaces.list.subscribe=="function"&&e.workspaces.list.subscribe(S),S();let b=(o,l)=>{let c={...n.current.pulling??{}};l?c[o]=!0:delete c[o],n.set({pulling:c})},N=0,C=(o,l)=>{window.clearInterval(N),N=window.setInterval(()=>{_e(o,l).catch(()=>window.clearInterval(N))},25e3)},j=async o=>{let l=o.replace(/\/+$/,""),c=e.workspaces.list.getSnapshot().items?.find(u=>u.path?.replace(/\/+$/,"")===l);return c||e.workspaces.create({path:o})},i=async(o,l)=>{let c=l!=null&&e.sessions.list.getSnapshot().byId?.[l]!=null;l!=null&&!c&&(await Je(o,l),await e.sessions.refresh())},E={copy:()=>F(t()),currentSessionId:()=>{let o=e.sessions.list.getSnapshot().byId??{};return Object.values(o).find(l=>(l.retainedBy?.mainView??0)>0)?.id??null},subscribeSession:o=>e.sessions.list.subscribe(()=>o(Object.values(e.sessions.list.getSnapshot().byId??{}).find(l=>(l.retainedBy?.mainView??0)>0)?.id??null)),settings:{get current(){return n.current},get open(){return n.current.open===!0},subscribe:o=>n.subscribe(()=>o(n.current)),close:()=>n.set({open:!1})},onOpenSettings:()=>{d(),n.set({open:!0,setupStage:n.current.configured===!0?"workspace":"bind"})},finishBind:()=>{n.set({setupStage:"workspace",listReady:!1,sessionsReady:!1}),d()},onToggleSection:()=>{n.current.listReady===!0&&n.set({sectionOpen:n.current.sectionOpen!==!0})},setExpandOnLoad:o=>{let l={expandOnLoad:o===!0,expandLimit:be};localStorage.setItem(on,JSON.stringify(l)),n.set({...l,...n.current.listReady===!0?{sectionOpen:l.expandOnLoad}:{}})},onRefresh:()=>{n.set({syncing:!0}),le().then(o=>{o.pushed>0&&n.set({notice:`${F(t()).syncPushed} ${o.pushed}`})}).catch(()=>{}).finally(()=>{n.set({syncing:!1}),d()})},onToggleWorkspace:o=>{let l=n.current.expanded?.[o]===!0;n.set({expanded:{...n.current.expanded??{},[o]:!l}})},onCreateSession:o=>{let l=(n.current.sharedWorkspaces??[]).find(u=>u.workspaceId===o),c=m(l,n.current.username);if(c===""){n.set({notice:F(t()).joinHint});return}n.set({notice:null,sectionOpen:!0,expanded:{...n.current.expanded??{},[o]:!0}}),b(o,!0),ue(o).finally(()=>b(o,!1)).then(()=>j(c)).then(u=>e.sessions.create({workspaceId:u.workspaceId})).then(u=>me(o,u).then(y=>{if(y?.busy===!0)throw new Error(F(t()).readOnlyBusy.replace("{holder}",y.holder??""));return C(o,u),u})).then(u=>{let y={workspaceId:o,sessionId:u,title:"",writerName:n.current.username??"",cwd:c};n.set({ownedSessionIds:[...n.current.ownedSessionIds??[],u],sessions:[y,...(n.current.sessions??[]).filter(a=>a.sessionId!==u)]}),r(),e.uiWorkspace.openSession(u),le().finally(()=>d())}).catch(u=>n.set({notice:`${F(t()).enterFailed}: ${u instanceof Error?u.message:String(u)}`}))},onOpenSession:o=>{n.set({notice:null,sectionOpen:!0,expanded:{...n.current.expanded??{},[o.workspaceId]:!0}});let l=()=>e.sessions.list.getSnapshot().byId?.[o.sessionId]!=null,c=()=>m((n.current.sharedWorkspaces??[]).find(f=>f.workspaceId===o.workspaceId),n.current.username),u=async()=>{let f=c();if(f!==""){let h=await j(f);e.workspaces.list.getSnapshot().items?.find(O=>O.workspaceId===h.workspaceId)?.sessionIds?.includes(o.sessionId)===!0||await Me(f,o.sessionId)}n.set({ownedSessionIds:[...n.current.ownedSessionIds??[],o.sessionId]}),r(),e.uiWorkspace.openSession(o.sessionId)},y=f=>{if(f?.busy===!0){n.set({notice:F(t()).readOnlyBusy.replace("{holder}",f.holder??"")});return}C(o.workspaceId,o.sessionId)};b(o.workspaceId,!0),(l()?u():i(o.workspaceId,o.sessionId).then(u)).then(()=>Promise.all([ue(o.workspaceId).finally(()=>b(o.workspaceId,!1)).catch(()=>{}),me(o.workspaceId,o.sessionId).then(y)])).catch(f=>n.set({notice:`${F(t()).pullFailed}: ${f instanceof Error?f.message:String(f)}`}))},onTogglePin:o=>{let c=(n.current.pinnedSessionIds??[]).includes(o.sessionId)?e.uiWorkspace.unpinSession(o.sessionId):e.uiWorkspace.pinSession(o.sessionId);Promise.resolve(c).catch(u=>n.set({notice:`${F(t()).pinSession}: ${u instanceof Error?u.message:String(u)}`}))},onToggleArchive:o=>{let c=(n.current.archivedSessionIds??[]).includes(o.sessionId)?e.uiWorkspace.unarchiveSession(o.sessionId):e.uiWorkspace.archiveSession(o.sessionId);Promise.resolve(c).catch(u=>n.set({notice:`${F(t()).archiveSession}: ${u instanceof Error?u.message:String(u)}`}))},onRenameSession:o=>n.set({rename:{workspaceId:o.workspaceId,sessionId:o.sessionId,title:o.title||""}}),confirmRename:o=>{let l=n.current.rename;if(l==null)return Promise.resolve();let c=o.trim();return c===""?Promise.resolve():e.sessions.using(l.sessionId,{source:"workspaceOperation"},u=>u.binding.session.rename(c)).then(u=>{if(u?.ok===!1)throw new Error(u.error?.message??"rename failed");n.set({rename:null,sessions:(n.current.sessions??[]).map(y=>y.sessionId===l.sessionId?{...y,title:c}:y)}),le().catch(()=>{})})},cancelRename:()=>n.set({rename:null}),dismissNotice:()=>n.set({notice:null}),onCloseTranscript:()=>n.set({transcript:null}),onToggleRail:()=>e.layout?.toggleSidebar?.(),onCreateWorkspace:()=>{if(n.current.configured!==!0){d(),n.set({open:!0,setupStage:"bind"});return}n.current.creating!==!0&&n.set({createDialog:{mode:"create"}})},onJoinWorkspace:o=>n.set({createDialog:{mode:"join",workspaceId:o}}),onCloseCreateDialog:o=>{n.set({createDialog:null,creating:!1,...o?{sectionOpen:!0}:{}}),o&&d()},createWorkspace:(o,l)=>(n.set({creating:!0}),$e(o,l)),joinWorkspace:(o,l)=>(n.set({creating:!0}),Fe(o,l)),createDirectory:He,listDirectory:qe,uiWorkspace:e.uiWorkspace,onViewOptions:o=>{let l=o?.currentTarget?.getBoundingClientRect?.();if(l===void 0)return;let c=F(t());de({anchor:l,items:[{id:"all",label:c.filterAll,run:()=>n.set({viewFilter:"all"})},{id:"mine",label:c.filterMine,run:()=>n.set({viewFilter:"mine"})},{id:"settings",label:c.settingsTitle??c.settings,run:()=>n.set({open:!0})}]})}};e.effect(()=>e.locale.register(Tn,{zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A"},en:{title:"Shared Workspace"}}),"nano-shared-workspace: dictionaries"),e.effect(()=>e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"nano-shared-workspace.section",inject:()=>({face:E})},nn)),"nano-shared-workspace: sidebar graft"),window.__nsw={store:n,ctx:e,face:E};let v=new MutationObserver(()=>r());v.observe(document.body,{childList:!0,subtree:!0}),e.effect(()=>()=>v.disconnect()),d()}return wn(Pn);})();
		return __nswExport;
	}
});
