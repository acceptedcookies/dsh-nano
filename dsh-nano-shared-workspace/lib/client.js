window.__ModuleLoader__.load({
	id: "dsh-nano-shared-workspace",
	factory: (require) => {
var __nswExport=(()=>{var _=Object.create;var S=Object.defineProperty;var J=Object.getOwnPropertyDescriptor;var V=Object.getOwnPropertyNames;var X=Object.getPrototypeOf,Q=Object.prototype.hasOwnProperty;var u=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var Z=(e,n)=>{for(var t in n)S(e,t,{get:n[t],enumerable:!0})},P=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let o of V(n))!Q.call(e,o)&&o!==t&&S(e,o,{get:()=>n[o],enumerable:!(r=J(n,o))||r.enumerable});return e};var k=(e,n,t)=>(t=e!=null?_(X(e)):{},P(n||!e||!e.__esModule?S(t,"default",{value:e,enumerable:!0}):t,e)),ee=e=>P(S({},"__esModule",{value:!0}),e);var ce={};Z(ce,{apply:()=>le,inject:()=>ae});var Ne=u("react");var c=k(u("react"),1),j=u("react-dom");var K=k(u("react"),1),m=u("@deepseek-ai/dsh-client-ui-primitives"),{createElement:s,useEffect:ne,useState:te}=K.default;function L({face:e,wide:n}){let t=e.copy(),[r,o]=te(e.settings.current);if(ne(()=>e.settings.subscribe(o),[]),!n)return s("div",{className:"nsw-rail",role:"complementary","aria-label":t.railTitle},s("button",{type:"button",className:"nsw-rail-button",title:t.railTitle,"aria-label":t.railTitle,onClick:e.onToggleRail},s(m.IconGlobeOutlineRegular,{size:16})));let i=r?.configured===!0;return s("div",{className:"nsw-root",role:"complementary","aria-label":t.title},s("div",{className:"nsw-section-header"},s("span",{className:"nsw-section-label"},s(m.IconGlobeOutlineRegular,{size:12,className:"nsw-label-icon"}),t.title),s("div",{className:"nsw-header-actions"},s("button",{type:"button",className:"nsw-icon-button",title:t.refresh??"Refresh","aria-label":t.refresh??"Refresh",onClick:e.onRefresh},s(m.IconRefreshOutlineRegular,{size:13})),s("button",{type:"button",className:"nsw-icon-button",title:t.settings,"aria-label":t.settings,"aria-haspopup":"dialog",onClick:e.onOpenSettings},s(m.IconSettingsOutlineRegular,{size:14})))),s("div",{className:"nsw-body"},i===!0?s("p",{className:"nsw-status","data-configured":"true"},t.configured," \xB7 ",r.username??"\u2014"):s("p",{className:"nsw-status"},t.unconfigured),!i&&s("p",{className:"nsw-hint"},t.emptyHint)))}var H=k(u("react"),1);var f=k(u("react"),1),b=u("@deepseek-ai/dsh-client-ui-primitives");function R({copy:e,title:n,description:t,confirmLabel:r,confirmDisabled:o,busy:i,error:l,danger:p,footer:T,maxHeight:y,width:v,region:E,onConfirm:h,onCancel:g,children:x}){return f.default.createElement(b.Modal,{open:!0,onClose:g,title:n,description:t,closeLabel:e.cancel,className:["nano-dialog-card",y===void 0?"":"nano-dialog-capped",v===void 0?"":"nano-dialog-sized",E===void 0?"":"nano-dialog-regioned"].filter(Boolean).join(" "),contentClassName:"nano-dialog-content",footer:T??f.default.createElement(f.default.Fragment,null,f.default.createElement(b.Button,{variant:"outline",className:"nano-modal-action",onClick:g},e.cancel),f.default.createElement(b.Button,{variant:p?"danger":"primary",className:"nano-modal-action",disabled:o===!0||i===!0,onClick:h},r??e.confirm))},x,l===void 0?null:f.default.createElement("p",{className:"nano-dialog-error",role:"alert"},l))}var N=u("@deepseek-ai/dsh-client-ui-primitives");var re="/nano-shared-workspace";async function O(e,n){let t=await fetch(`${re}${e}`,{credentials:"same-origin",cache:"no-store",...n}),r=await t.json().catch(()=>({}));if(!t.ok)throw new Error(typeof r?.error=="string"?r.error:`HTTP ${t.status}`);return r}var q=()=>O("/settings"),M=()=>O("/status");function D({username:e,token:n,accessKey:t}){return O("/settings/update",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({username:e,token:n,accessKey:t})})}var{createElement:a,useState:w}=H.default;function C({label:e,children:n}){return a("label",{className:"nsw-field"},a("span",{className:"nsw-field-label"},e),n)}function A({face:e,settings:n}){let t=e.copy(),[r,o]=w(n?.username??""),[i,l]=w(""),[p,T]=w(""),[y,v]=w(!1),[E,h]=w(void 0),g=r.trim(),x=g!==""&&i.trim()!==""&&!y,G=async()=>{if(!x){h(g===""?t.usernameRequired:t.tokenRequired);return}v(!0),h(void 0);try{await D({username:g,token:i.trim(),accessKey:p.trim()===""?void 0:p.trim()}),e.settings.close()}catch(d){h(`${t.errorSave}: ${d instanceof Error?d.message:String(d)}`)}finally{v(!1)}};return a(R,{copy:t,title:t.settingsTitle,description:t.settingsDescription,confirmLabel:t.save,confirmDisabled:!x,busy:y,error:E,width:420,onConfirm:G,onCancel:e.settings.close},a("div",{className:"nsw-endpoint"},a("span",{className:"nsw-endpoint-row"},a("span",{className:"nsw-endpoint-key"},t.endpointLabel),a("code",{className:"nsw-endpoint-value"},n?.endpoint??"\u2014")),a("span",{className:"nsw-endpoint-row"},a("span",{className:"nsw-endpoint-key"},t.bucketLabel),a("code",{className:"nsw-endpoint-value"},n?.bucket??"\u2014"))),a(C,{label:t.username},a(N.Input,{value:r,placeholder:t.usernamePlaceholder,"data-modal-autofocus":!0,onChange:d=>o(d.currentTarget.value)})),a(C,{label:t.token},a(N.Input,{type:"password",value:i,placeholder:n?.configured===!0?`${t.configured} \xB7 ${n?.maskedSecret??""}`:t.tokenPlaceholder,onChange:d=>l(d.currentTarget.value)})),a(C,{label:t.accessKeyOptional},a(N.Input,{value:p,placeholder:t.accessKeyPlaceholder,onChange:d=>T(d.currentTarget.value)})),a("p",{className:"nsw-join-hint"},t.joinHint))}var F="data-nano-shared-workspace";function oe(){return document.querySelector('[role="tree"]')}function $(){let e=oe();for(;e!==null&&e!==document.body;){let n=e.parentElement;if(n!==null&&n.querySelector(":scope > nav")!==null)return e;e=n}for(let n of document.querySelectorAll("nav")){if(n.parentElement===null)continue;let r=n.nextElementSibling;if(r!==null&&r.tagName==="DIV"&&r.querySelector("nav")===null)return r}return null}function z(){let e=$();return e===null?!0:e.getBoundingClientRect().width>80}function I(){let e=$();if(e===null)return null;let n=e.querySelector(`[${F}]`);return n===null?(n=document.createElement("div"),n.setAttribute(F,""),n.className="nsw-graft",e.prepend(n)):n!==e.firstElementChild&&e.prepend(n),n}function B({face:e}){let[n,t]=c.default.useState(()=>I()),[r,o]=c.default.useState(()=>z()),[i,l]=c.default.useState(e.settings.current);return c.default.useEffect(()=>e.settings.subscribe(l),[]),c.default.useEffect(()=>{let p=new MutationObserver(()=>{t(I()),o(z())});return p.observe(document.body,{childList:!0,subtree:!0,attributes:!0}),t(I()),o(z()),()=>{p.disconnect(),n?.remove()}},[]),n===null?null:c.default.createElement(c.default.Fragment,null,(0,j.createPortal)(c.default.createElement(L,{face:e,wide:r}),n),i?.open===!0?(0,j.createPortal)(c.default.createElement(A,{face:e,settings:i}),document.body):null)}var W={zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A",railTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A",settings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",settingsTitle:"\u5171\u4EAB\u5DE5\u4F5C\u533A\u8BBE\u7F6E",settingsDescription:"\u8EAB\u4EFD\u5199\u5165\u51ED\u636E\u5B58\u50A8\uFF1BS3 \u771F\u6E90\u7AEF\u70B9\u5728\u670D\u52A1\u7AEF\u914D\u7F6E\u4E2D\u56FA\u5B9A\u3002",username:"\u7528\u6237\u540D",usernamePlaceholder:"\u5728\u5171\u4EAB\u7A7A\u95F4\u663E\u793A\u7684\u540D\u5B57",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key \u6216\u670D\u52A1\u7AEF\u4EE4\u724C",accessKeyOptional:"\u8BBF\u95EE\u5BC6\u94A5\uFF08\u53EF\u9009\uFF09",accessKeyPlaceholder:"\u72EC\u7ACB access key \u65F6\u586B\u5199",endpointLabel:"\u7AEF\u70B9",bucketLabel:"\u5B58\u50A8\u6876",configured:"\u5DF2\u914D\u7F6E",unconfigured:"\u672A\u914D\u7F6E \u2014 \u6253\u5F00\u8BBE\u7F6E\u52A0\u5165\u5171\u4EAB\u7A7A\u95F4",emptyHint:"\u914D\u7F6E\u7528\u6237\u540D\u548C MinIO Token \u540E\uFF0C\u8FD9\u91CC\u4F1A\u51FA\u73B0\u8FDC\u7AEF\u5171\u4EAB\u7684\u4F1A\u8BDD\u3002",usernameRequired:"\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A",tokenRequired:"MinIO Token \u4E0D\u80FD\u4E3A\u7A7A",saved:"\u5DF2\u4FDD\u5B58",clear:"\u6E05\u9664",clearTitle:"\u6E05\u9664\u5171\u4EAB\u51ED\u636E",clearBody:"\u5220\u9664\u672C\u673A\u4FDD\u5B58\u7684\u7528\u6237\u540D\u548C MinIO Token\uFF0C\u5E76\u65AD\u5F00\u5171\u4EAB\u7A7A\u95F4\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",cancel:"\u53D6\u6D88",confirm:"\u4FDD\u5B58",close:"\u5173\u95ED",save:"\u4FDD\u5B58",joinHint:"\u591A\u53F0\u5BA2\u6237\u7AEF\u4F7F\u7528\u540C\u4E00\u7528\u6237\u540D + Token \u5373\u89C6\u4E3A\u540C\u4E00\u8EAB\u4EFD\u3002",errorLoad:"\u8BFB\u53D6\u8BBE\u7F6E\u5931\u8D25",errorSave:"\u4FDD\u5B58\u5931\u8D25"},en:{title:"Shared Workspace",railTitle:"Shared Workspace",settings:"Settings",refresh:"Refresh",settingsTitle:"Shared Workspace Settings",settingsDescription:"Identity is stored in the credential store; the S3 source of truth is fixed in server config.",username:"Username",usernamePlaceholder:"Name shown in the shared space",token:"MinIO Token",tokenPlaceholder:"Access Key:Secret Key or server token",accessKeyOptional:"Access Key (optional)",accessKeyPlaceholder:"Only for a separate access key",endpointLabel:"Endpoint",bucketLabel:"Bucket",configured:"Configured",unconfigured:"Not configured \u2014 open settings to join",emptyHint:"Configure a username and MinIO token, and shared remote sessions will appear here.",usernameRequired:"Username is required",tokenRequired:"MinIO token is required",saved:"Saved",clear:"Clear",clearTitle:"Clear shared credentials",clearBody:"Remove the locally stored username and MinIO token and leave the shared space. This cannot be undone.",cancel:"Cancel",confirm:"Save",close:"Close",save:"Save",joinHint:"Clients sharing the same username + token count as one identity.",errorLoad:"Failed to load settings",errorSave:"Failed to save"}},U=e=>W[e==="zh"?"zh":"en"]??W.en;var Y=`
.nsw-graft { flex: none; min-height: 0; }
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
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  color: inherit;
}
.nsw-label-icon { flex: none; opacity: 0.9; }
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
  padding: 0 12px 8px calc(var(--dsh-sidebar-row-padding, 12px));
  font-size: 12px;
  line-height: 1.45;
  color: var(--dsw-alias-label-secondary, #888);
}
.nsw-status { margin: 0; }
.nsw-status[data-configured] { color: var(--dsw-alias-label-primary, inherit); font-weight: 500; }
.nsw-hint {
  margin: 4px 0 0;
  color: var(--dsw-alias-label-tertiary, #999);
  font-size: 11.5px;
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
`;var ae=["slots","locale","layout"],se="nanoSharedWorkspace";function ie(){let e={open:!1,loaded:!1,configured:!1,username:null},n=new Set,t=()=>{for(let r of n)r()};return{get current(){return e},set(r){e={...e,...r},t()},subscribe:r=>(n.add(r),()=>n.delete(r))}}function le(e){let n=document.createElement("style");n.dataset.nswStyle="true",n.textContent=Y,document.head.append(n),e.effect(()=>()=>n.remove());let t=()=>e.locale.getSnapshot().active,r=ie(),o=()=>{q().then(l=>r.set({...l,loaded:!0})).catch(()=>r.set({loaded:!0})),M().catch(()=>{})},i={copy:()=>U(t()),settings:{get current(){return r.current},get open(){return r.current.open===!0},subscribe:l=>r.subscribe(()=>l(r.current)),close:()=>r.set({open:!1})},onOpenSettings:()=>{o(),r.set({open:!0})},onRefresh:o,onToggleRail:()=>e.layout?.toggleSidebar?.()};e.effect(()=>e.locale.register(se,{zh:{title:"\u5171\u4EAB\u5DE5\u4F5C\u533A"},en:{title:"Shared Workspace"}}),"nano-shared-workspace: dictionaries"),e.effect(()=>e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"nano-shared-workspace.section",inject:()=>({face:i})},B)),"nano-shared-workspace: sidebar graft"),o()}return ee(ce);})();
		return __nswExport;
	}
});
