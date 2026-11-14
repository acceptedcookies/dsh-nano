window.__ModuleLoader__.load({
	id: "dsh-nano-cloud-session",
	factory: (require) => {
var __dncsExport=(()=>{var j=Object.create;var I=Object.defineProperty;var q=Object.getOwnPropertyDescriptor;var O=Object.getOwnPropertyNames;var V=Object.getPrototypeOf,W=Object.prototype.hasOwnProperty;var B=(s=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(s,{get:(e,d)=>(typeof require<"u"?require:e)[d]}):s)(function(s){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+s+'" is not supported')});var F=(s,e)=>{for(var d in e)I(s,d,{get:e[d],enumerable:!0})},M=(s,e,d,p)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of O(e))!W.call(s,o)&&o!==d&&I(s,o,{get:()=>e[o],enumerable:!(p=q(e,o))||p.enumerable});return s};var J=(s,e,d)=>(d=s!=null?j(V(s)):{},M(e||!s||!s.__esModule?I(d,"default",{value:s,enumerable:!0}):d,s)),Z=s=>M(I({},"__esModule",{value:!0}),s);var se={};F(se,{apply:()=>ae,inject:()=>X});var A=J(B("react"),1);async function m(s,e){let d=await fetch(s,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e??{})}),p=null;try{p=await d.json()}catch{}if(!d.ok||!p||p.ok===!1){let o=new Error(p?.message??`HTTP ${d.status}`);throw o.reason=p?.reason??"failed",o.status=p?.status??d.status,o}return p}var b={status:()=>m("/nano-cloud-session/status"),config:(s,e={})=>m("/nano-cloud-session/config",{action:s,...e}),sessions:(s={})=>m("/nano-cloud-session/sessions",{op:"list",...s}),session:(s,e={})=>m("/nano-cloud-session/session",{op:s,...e}),create:s=>m("/nano-cloud-session/create",s),message:(s,e)=>m("/nano-cloud-session/message",{session_id:s,message:e}),archive:s=>m("/nano-cloud-session/archive",{session_id:s}),unarchive:s=>m("/nano-cloud-session/unarchive",{session_id:s}),terminate:s=>m("/nano-cloud-session/terminate",{session_id:s}),ssh:s=>m("/nano-cloud-session/ssh",{session_id:s})};var G=`
.dncs { position: fixed; right: 24px; bottom: 88px; width: 520px; max-width: calc(100vw - 48px); height: 640px; max-height: calc(100vh - 160px);
  display: flex; flex-direction: column; border-radius: var(--dsw-radius-lg, 12px); overflow: hidden;
  background: var(--dsw-alias-bg-primary, #1b1d21); color: var(--dsw-alias-label-primary, #e8eaed);
  border: 1px solid var(--dsw-alias-border-primary, #33363c); box-shadow: 0 12px 40px rgba(0,0,0,.45);
  font: 13px/1.5 var(--dsw-font-family, system-ui, sans-serif); z-index: 60; }
.dncs * { box-sizing: border-box; }
.dncs-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--dsw-alias-border-primary, #33363c); }
.dncs-head b { font-size: 14px; }
.dncs-tabs { display: flex; gap: 4px; margin-left: auto; }
.dncs-tab { border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #9aa0a6); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.dncs-tab[data-on="1"] { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); color: var(--dsw-alias-label-primary, #e8eaed); }
.dncs-body { flex: 1; overflow: auto; padding: 12px 14px; }
.dncs-foot { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-top: 1px solid var(--dsw-alias-border-primary, #33363c); }
.dncs button { font: inherit; }
.dncs-btn { border: 1px solid var(--dsw-alias-border-primary, #33363c); background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-primary, #e8eaed); padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.dncs-btn:hover { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); }
.dncs-btn.primary { background: var(--dsw-alias-accent-primary, #4c8dff); border-color: transparent; color: #fff; }
.dncs-btn.danger { color: var(--dsw-alias-label-danger, #ff7b72); }
.dncs-btn[disabled] { opacity: .5; cursor: default; }
.dncs-row { padding: 8px 10px; border: 1px solid var(--dsw-alias-border-primary, #33363c); border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
.dncs-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); }
.dncs-row[data-selected="1"] { border-color: var(--dsw-alias-accent-primary, #4c8dff); }
.dncs-row .t { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dncs-row .m { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); display: flex; gap: 8px; flex-wrap: wrap; }
.dncs-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--dsw-alias-bg-secondary, #22252b); border: 1px solid var(--dsw-alias-border-primary, #33363c); }
.dncs-badge.running, .dncs-badge.claimed, .dncs-badge.working { color: #6ee7a0; }
.dncs-badge.suspended { color: #e8c46e; }
.dncs-badge.exit, .dncs-badge.archived { color: #9aa0a6; }
.dncs-field { margin-bottom: 10px; }
.dncs-field label { display: block; font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); margin-bottom: 4px; }
.dncs-field input, .dncs-field textarea, .dncs-field select { width: 100%; font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-primary, #33363c); background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-primary, #e8eaed); }
.dncs-field textarea { min-height: 88px; resize: vertical; }
.dncs-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); margin-top: 3px; }
.dncs-note { font-size: 12px; padding: 8px 10px; border-radius: 6px; background: var(--dsw-alias-bg-secondary, #22252b); margin-bottom: 10px; }
.dncs-note.err { color: var(--dsw-alias-label-danger, #ff7b72); }
.dncs-msg { padding: 8px 10px; border-radius: 8px; margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; }
.dncs-msg .who { font-size: 10px; color: var(--dsw-alias-label-secondary, #9aa0a6); margin-bottom: 3px; display: flex; gap: 8px; }
.dncs-msg.user { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); }
.dncs-msg.devin { background: var(--dsw-alias-bg-secondary, #22252b); }
.dncs-kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 12px; margin-bottom: 10px; }
.dncs-kv dt { color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-kv dd { margin: 0; overflow-wrap: anywhere; }
.dncs-prof { border: 1px solid var(--dsw-alias-border-primary, #33363c); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.dncs-prof .m { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-prof .acts { display: flex; gap: 6px; margin-top: 6px; }
.dncs-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.dncs-toolbar label { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); display: inline-flex; gap: 4px; align-items: center; }
.dncs-hidden { display: none !important; }
.dncs-msg-box { display: flex; gap: 8px; margin-top: 10px; }
.dncs-msg-box input { flex: 1; font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-primary, #33363c); background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-primary, #e8eaed); }
.dncs code { font-family: var(--dsw-font-mono, ui-monospace, monospace); font-size: 11px; background: var(--dsw-alias-bg-secondary, #22252b); padding: 1px 4px; border-radius: 4px; }
.dncs a { color: var(--dsw-alias-accent-primary, #4c8dff); }
`,t=s=>String(s??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),z=s=>{let e=Math.max(0,Date.now()/1e3-s);return e<60?`${e|0}s`:e<3600?`${e/60|0}m`:e<86400?`${e/3600|0}h`:`${e/86400|0}d`};function E(s,{t:e,pollIntervalMs:d=5e3}){let p=document.createElement("style");p.textContent=G,s.append(p);let o=document.createElement("div");o.className="dncs dncs-hidden",s.append(o);let a={tab:"sessions",profiles:[],activeId:null,self:null,sessions:[],cursor:null,hasMore:!1,selected:null,detail:null,transcript:[],transcriptAfter:null,showArchived:null,poll:!0,busy:!1,error:""},u=null;function v(){return a.error?`<div class="dncs-note err">${t(e("error"))}: ${t(a.error)}</div>`:""}function h(r){let n=r?.status??"unknown",c=r?.is_archived?` \xB7 ${e("archived")}`:"";return`<span class="dncs-badge ${t(n)}">${t(n)}${c}</span>`}function l(){o.querySelector(".dncs-head").innerHTML=`
      <b>${t(e("title"))}</b>
      <span class="dncs-tabs">
        <button class="dncs-tab" data-tab="sessions" data-on="${a.tab==="sessions"||a.tab==="detail"?1:0}">${t(e("tabSessions"))}</button>
        <button class="dncs-tab" data-tab="new" data-on="${a.tab==="new"?1:0}">${t(e("tabNew"))}</button>
        <button class="dncs-tab" data-tab="settings" data-on="${a.tab==="settings"?1:0}">${t(e("tabSettings"))}</button>
      </span>`}function _(){let r=a.sessions.map(n=>`
      <div class="dncs-row" data-selected="${a.selected===n.session_id?1:0}" data-id="${t(n.session_id)}">
        <div class="t">${t(n.title||n.session_id)}</div>
        <div class="m">${h(n)}<span>${t(n.devin_mode??"")}</span><span>${z(n.updated_at??n.created_at??0)}</span><span>${t(String(n.acus_consumed??"0"))} ACU</span></div>
      </div>`).join("");return`
      <div class="dncs-toolbar">
        <button class="dncs-btn" data-act="refresh">${t(e("refresh"))}</button>
        <label><input type="checkbox" data-act="poll" ${a.poll?"checked":""}> ${t(e("poll"))}</label>
        <label><input type="checkbox" data-act="archived" ${a.showArchived?"checked":""}> ${t(e("showArchived"))}</label>
      </div>
      ${v()}
      ${a.sessions.length===0?`<div class="dncs-note">${t(e("empty"))}</div>`:r}
      ${a.hasMore?'<button class="dncs-btn" data-act="more">\u2026</button>':""}
      <div class="dncs-detail-slot"></div>`}function L(){let r=a.detail;if(!r)return"";let n=a.transcript.map(c=>`
      <div class="dncs-msg ${t(c.source)}">
        <div class="who"><span>${t(c.source==="user"?e("role_user"):c.source==="devin"?e("role_devin"):e("role_system"))}</span><span>${c.username?t(c.username):""}</span><span>${z(c.created_at??0)}</span></div>
        <div>${t(c.message)}</div>
      </div>`).join("");return`
      <div class="dncs-prof" style="margin-top:10px">
        <dl class="dncs-kv">
          <dt>id</dt><dd><code>${t(r.session_id)}</code></dd>
          <dt>${t(e("status"))}</dt><dd>${h(r)} ${t(r.status_detail??"")}</dd>
          <dt>ACU</dt><dd>${t(String(r.acus_consumed??"0"))}</dd>
          <dt>mode</dt><dd>${t(r.devin_mode??"")}</dd>
          <dt>url</dt><dd><a href="${t(r.url)}" target="_blank" rel="noreferrer">${t(r.url)}</a></dd>
        </dl>
        <div class="acts">
          <button class="dncs-btn" data-act="webapp">${t(e("openInWebapp"))}</button>
          <button class="dncs-btn" data-act="ssh">${t(e("sshCommand"))}</button>
          ${r.is_archived?`<button class="dncs-btn" data-act="unarchive">${t(e("unarchive"))}</button>`:`<button class="dncs-btn" data-act="archive">${t(e("archive"))}</button>`}
          <button class="dncs-btn danger" data-act="terminate">${t(e("terminate"))}</button>
        </div>
      </div>
      <div class="dncs-msgs">${n}</div>
      <div class="dncs-msg-box">
        <input type="text" data-msg placeholder="${t(e("messagePlaceholder"))}">
        <button class="dncs-btn primary" data-act="send">${t(e("send"))}</button>
      </div>`}function U(){return`
      ${v()}
      <div class="dncs-field"><label>${t(e("prompt"))} *</label><textarea data-f="prompt" placeholder="${t(e("promptPlaceholder"))}"></textarea></div>
      <div class="dncs-field"><label>${t(e("titleField"))}</label><input data-f="title" type="text"></div>
      <div class="dncs-field"><label>${t(e("repos"))}</label><textarea data-f="repos" style="min-height:52px"></textarea><div class="dncs-hint">owner/repo \u2014 carrier \u5BF9 repos \u53EA\u505A\u6D45\u6821\u9A8C\uFF0C\u540D\u5B57\u5199\u9519\u4E5F\u4F1A 200</div></div>
      <div class="dncs-field"><label>${t(e("devinMode"))}</label>
        <select data-f="devin_mode"><option value="">default</option><option>lite</option><option>normal</option><option>fast</option><option>ultra</option><option>fusion</option></select></div>
      <div class="dncs-field"><label>${t(e("maxAcu"))}</label><input data-f="max_acu_limit" type="number" min="0"></div>
      <div class="dncs-field"><label><input data-f="resumable" type="checkbox" checked> ${t(e("resumable"))}</label></div>
      <button class="dncs-btn primary" data-act="create" ${a.busy?"disabled":""}>${t(e("create"))}</button>`}function K(){let r=a.profiles.map(n=>`
      <div class="dncs-prof" data-active="${n.active}">
        <b>${t(n.label)}</b>${n.active?` \xB7 <span class="dncs-badge running">${t(e("active"))}</span>`:""}
        <div class="m"><code>${t(n.orgId)}</code> \xB7 ${t(n.baseUrl)} \xB7 ${n.hasSecret?"token \u2022\u2022\u2022\u2022":"no token"}</div>
        <div class="acts">
          <button class="dncs-btn" data-act="test" data-id="${t(n.id)}">${t(e("test"))}</button>
          ${n.active?"":`<button class="dncs-btn" data-act="activate" data-id="${t(n.id)}">${t(e("activate"))}</button>`}
          ${n.active?"":`<button class="dncs-btn danger" data-act="del-profile" data-id="${t(n.id)}">${t(e("delete"))}</button>`}
        </div>
      </div>`).join("");return`
      ${v()}
      ${a.profiles.length===0?`<div class="dncs-note">${t(e("noProfile"))}</div>`:r}
      <div class="dncs-prof">
        <b>${t(e("profileNew"))}</b>
        <div class="dncs-field" style="margin-top:8px"><label>${t(e("label"))}</label><input data-p="label" type="text"></div>
        <div class="dncs-field"><label>${t(e("orgId"))}</label><input data-p="orgId" type="text" placeholder="org-\u2026"></div>
        <div class="dncs-field"><label>${t(e("token"))}</label><input data-p="secret" type="password" placeholder="cog_\u2026"><div class="dncs-hint">${t(e("tokenHint"))}</div></div>
        <div class="dncs-field"><label>${t(e("baseUrl"))}</label><input data-p="baseUrl" type="text" placeholder="https://api.devin.ai"></div>
        <button class="dncs-btn primary" data-act="save-profile">${t(e("save"))}</button>
      </div>`}function w(){o.querySelector(".dncs-head")||(o.innerHTML='<div class="dncs-head"></div><div class="dncs-body"></div>'),l();let r=o.querySelector(".dncs-body");if(a.tab==="sessions"||a.tab==="detail"?r.innerHTML=_():a.tab==="new"?r.innerHTML=U():r.innerHTML=K(),a.tab==="sessions"||a.tab==="detail"){let n=r.querySelector(".dncs-detail-slot");n&&a.detail&&(n.innerHTML=L())}}async function $(){let r=await b.status();a.profiles=r.profiles??[],a.activeId=r.activeId??null}async function g(){try{let r=await b.sessions({first:50,is_archived:a.showArchived===null?null:a.showArchived}),n=r.items??r.sessions??[];a.sessions=n,a.hasMore=!!r.has_next_page,a.cursor=r.end_cursor??null,a.error=""}catch(r){a.error=r.message}}async function y(r,{keepScroll:n}={}){try{let[c,f]=await Promise.all([b.session("get",{session_id:r}),b.session("messages",{session_id:r,first:100})]);a.detail=c,a.transcript=(f.items??f.messages??[]).slice().sort((S,i)=>(S.created_at??0)-(i.created_at??0)),a.error=""}catch(c){a.error=c.message}}function k(){clearTimeout(u),!(!a.poll||a.tab==="settings")&&(u=setTimeout(async()=>{await g(),a.selected&&await y(a.selected),w(),k()},d))}o.addEventListener("click",async r=>{let n=r.target.closest(".dncs-tab");if(n){a.tab=n.dataset.tab,a.error="",w(),k();return}let c=r.target.closest(".dncs-row"),f=r.target.closest("[data-act]");if(c&&!f){a.selected=c.dataset.id,a.tab="detail",await y(a.selected),w();return}if(!f)return;let S=f.dataset.act;try{switch(S){case"refresh":await g();break;case"poll":a.poll=f.checked,k();break;case"archived":a.showArchived=f.checked,await g();break;case"webapp":a.detail?.url&&window.open(a.detail.url,"_blank","noreferrer");return;case"ssh":{let i=await b.ssh(a.selected);await navigator.clipboard?.writeText(i.command).catch(()=>{}),a.error=`${i.command} \u2014 ${i.forwardHint}`;break}case"archive":await b.archive(a.selected),await y(a.selected),await g();break;case"unarchive":await b.unarchive(a.selected),await y(a.selected),await g();break;case"terminate":window.confirm(e("terminateConfirm"))&&(await b.terminate(a.selected),a.selected=null,a.detail=null,a.tab="sessions",await g());break;case"send":{let i=o.querySelector("[data-msg]"),x=i.value.trim();x&&(await b.message(a.selected,x),i.value="",await y(a.selected));break}case"create":{a.busy=!0,w();let i=T=>o.querySelector(`[data-f="${T}"]`)?.value??"",x=i("repos").split(`
`).map(T=>T.trim()).filter(Boolean),P=await b.create({prompt:i("prompt"),title:i("title")||void 0,repos:x.length?x:void 0,devin_mode:i("devin_mode")||void 0,max_acu_limit:i("max_acu_limit")?Number(i("max_acu_limit")):void 0,resumable:o.querySelector('[data-f="resumable"]')?.checked,tags:["dsh-dncs"]});a.busy=!1;let C=P.session_id??P.id;C&&(a.selected=C,a.tab="detail",await y(C)),await g();break}case"save-profile":{let i=x=>o.querySelector(`[data-p="${x}"]`)?.value.trim()??"";await b.config("save",{profile:{label:i("label"),orgId:i("orgId"),baseUrl:i("baseUrl")||void 0,secret:i("secret")||void 0}}),await $();break}case"activate":await b.config("activate",{profileId:f.dataset.id}),await $();break;case"del-profile":await b.config("remove",{profileId:f.dataset.id}),await $();break;case"test":{let i=await b.config("test",{profileId:f.dataset.id});a.error=`ok: ${i.self?.principal_type??""} ${i.self?.api_key_name??""} ${i.self?.devin_sessions_org_id??""}`;break}}a.error=S==="test"?a.error:""}catch(i){a.error=i.message,a.busy=!1}w()});async function R(){try{await $(),a.activeId&&await g(),a.error=""}catch(r){a.error=r.message}w(),k()}return R(),{toggle(){let r=o.classList.toggle("dncs-hidden");return r?clearTimeout(u):($().then(g).then(w).catch(()=>{}),k()),r},setShortcut(){},stopTheme(){},failed(r){a.error=String(r?.message??r),w()}}}var Q={title:"\u4E91\u4F1A\u8BDD",tabSessions:"\u4F1A\u8BDD",tabNew:"\u65B0\u5EFA",tabSettings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u6682\u65E0\u4F1A\u8BDD",create:"\u521B\u5EFA\u4F1A\u8BDD",prompt:"\u63D0\u793A\u8BCD",promptPlaceholder:"\u7ED9 Devin \u7684\u4EFB\u52A1\u63CF\u8FF0\u2026",titleField:"\u6807\u9898\uFF08\u53EF\u9009\uFF09",repos:"\u4ED3\u5E93\uFF08\u6BCF\u884C\u4E00\u4E2A owner/repo\uFF09",devinMode:"Agent \u6A21\u5F0F",maxAcu:"ACU \u4E0A\u9650\uFF08\u53EF\u9009\uFF09",resumable:"\u53EF\u6062\u590D\uFF08suspend \u540E\u4FDD\u7559 VM \u5FEB\u7167\uFF09",send:"\u53D1\u9001",messagePlaceholder:"\u5411\u8BE5\u4F1A\u8BDD\u53D1\u6D88\u606F\uFF08\u53EF\u5524\u9192\u6302\u8D77\u7684\u4F1A\u8BDD\uFF09\u2026",archive:"\u5F52\u6863",unarchive:"\u53D6\u6D88\u5F52\u6863",terminate:"\u4E2D\u6B62",terminateConfirm:"\u4E2D\u6B62\u8BE5 session\uFF1F\u8BB0\u5F55\u4ECD\u53EF\u8BFB\uFF0C\u4E0D\u662F\u786C\u5220\u9664\uFF1B\u5982\u9700\u6536\u5C3E\u8BF7\u518D\u70B9\u5F52\u6863\u3002",openInWebapp:"\u5728 Devin \u6253\u5F00",sshCommand:"SSH \u547D\u4EE4",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",profiles:"\u51ED\u8BC1\u914D\u7F6E",profileNew:"\u65B0\u589E\u914D\u7F6E",label:"\u540D\u79F0",orgId:"Org ID",token:"API Token",tokenHint:"cog_ \u524D\u7F00\u7684 PAT \u6216 service user key\uFF1B\u53EA\u5199\u5BBF\u4E3B\uFF0C\u4E0D\u56DE\u8BFB",baseUrl:"\u4E0A\u6E38 Base URL",save:"\u4FDD\u5B58",delete:"\u5220\u9664",activate:"\u8BBE\u4E3A\u5F53\u524D",test:"\u8FDE\u63A5\u6D4B\u8BD5",active:"\u5F53\u524D",status:"\u72B6\u6001",messages:"\u6D88\u606F",details:"\u8BE6\u60C5",noProfile:"\u5C1A\u672A\u914D\u7F6E carrier \u51ED\u8BC1\u2014\u2014\u5230\u300C\u8BBE\u7F6E\u300D\u65B0\u589E\u4E00\u4E2A profile\u3002",poll:"\u81EA\u52A8\u5237\u65B0",error:"\u9519\u8BEF",first:"\u6BCF\u9875\u6570\u91CF",archived:"\u5DF2\u5F52\u6863",showArchived:"\u663E\u793A\u5DF2\u5F52\u6863",role_user:"\u6211",role_devin:"Devin",role_system:"\u7CFB\u7EDF"},N={title:"Cloud Sessions",tabSessions:"Sessions",tabNew:"New",tabSettings:"Settings",refresh:"Refresh",loading:"Loading\u2026",empty:"No sessions",create:"Create session",prompt:"Prompt",promptPlaceholder:"Task description for Devin\u2026",titleField:"Title (optional)",repos:"Repos (one owner/repo per line)",devinMode:"Agent mode",maxAcu:"ACU limit (optional)",resumable:"Resumable (keep VM snapshot after suspend)",send:"Send",messagePlaceholder:"Message this session (wakes suspended sessions)\u2026",archive:"Archive",unarchive:"Unarchive",terminate:"Terminate",terminateConfirm:"Terminate this session? The record stays readable \u2014 not a hard delete; archive afterwards to close it out.",openInWebapp:"Open in Devin",sshCommand:"SSH command",copy:"Copy",copied:"Copied",profiles:"Credentials",profileNew:"New profile",label:"Label",orgId:"Org ID",token:"API token",tokenHint:"cog_-prefixed PAT or service user key; stored host-side, never read back",baseUrl:"Upstream base URL",save:"Save",delete:"Delete",activate:"Activate",test:"Test",active:"active",status:"Status",messages:"Messages",details:"Details",noProfile:"No carrier credential yet \u2014 add a profile under Settings.",poll:"Auto-refresh",error:"Error",first:"Page size",archived:"archived",showArchived:"Show archived",role_user:"Me",role_devin:"Devin",role_system:"System"};function D(s){let e=()=>(s()??"en").startsWith("zh")?"zh":"en";return d=>(e()==="zh"?Q[d]:N[d])??N[d]??d}var X=["slots","theme","locale","shortcuts"],Y="0.1.0";function ee(s){return s==="mac"?"\u2318E\xB72":s==="windows"?"Alt+E\xB72":"Ctrl+E\xB72"}function H(s,e){return e==="mac"?s.metaKey&&!s.ctrlKey&&!s.altKey:e==="windows"?s.altKey&&!s.ctrlKey:s.ctrlKey&&!s.altKey}function ae(s,e={}){let d=D(()=>s.locale.getSnapshot().active),p=()=>s.locale.getSnapshot().active?.startsWith("zh")?"\u4E91\u4F1A\u8BDD":"Cloud Sessions",o=s.shortcuts.platform,a;s.slots.inject("shell.overlay",()=>s.slots.register({name:"shell.overlay",id:"nano-cloud-session",order:50,inject:()=>({label:()=>`${p()} (${ee(o)})`,ready:u=>{a=u}})},function({ready:v}){let h=A.default.useRef(null);return A.default.useEffect(()=>{let l=h.current;if(!l)return;let _=E(l,{t:d,pollIntervalMs:e.pollIntervalMs??5e3});return v(_),()=>{v(void 0),l.replaceChildren()}},[]),A.default.createElement("div",{ref:h,"data-nano-cloud-session":"root","data-version":Y})})),s.effect(()=>{let u=!1,v=l=>{if(!l.isComposing){if(l.code==="KeyE"){u=H(l,o)&&!l.shiftKey,u&&o==="windows"&&l.altKey===!0&&l.preventDefault();return}!u||l.code!=="Digit2"||l.repeat||!H(l,o)||l.shiftKey||(l.preventDefault(),l.stopPropagation(),a?.toggle())}},h=l=>{(l.code==="KeyE"||l.key==="Meta"||l.key==="Control"||l.key==="Alt")&&(u=!1)};return document.addEventListener("keydown",v,!0),document.addEventListener("keyup",h,!0),()=>{document.removeEventListener("keydown",v,!0),document.removeEventListener("keyup",h,!0)}})}return Z(se);})();
		return __dncsExport;
	}
});
