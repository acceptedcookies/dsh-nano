window.__ModuleLoader__.load({
	id: "dsh-nano-cloud-session",
	factory: (require) => {
var __dncsExport=(()=>{var R=Object.create;var S=Object.defineProperty;var W=Object.getOwnPropertyDescriptor;var F=Object.getOwnPropertyNames;var V=Object.getPrototypeOf,B=Object.prototype.hasOwnProperty;var G=(t=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(t,{get:(e,d)=>(typeof require<"u"?require:e)[d]}):t)(function(t){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+t+'" is not supported')});var J=(t,e)=>{for(var d in e)S(t,d,{get:e[d],enumerable:!0})},K=(t,e,d,u)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of F(e))!B.call(t,i)&&i!==d&&S(t,i,{get:()=>e[i],enumerable:!(u=W(e,i))||u.enumerable});return t};var Z=(t,e,d)=>(d=t!=null?R(V(t)):{},K(e||!t||!t.__esModule?S(d,"default",{value:t,enumerable:!0}):d,t)),Q=t=>K(S({},"__esModule",{value:!0}),t);var re={};J(re,{apply:()=>te,inject:()=>ee});var I=Z(G("react"),1);async function g(t,e){let d=await fetch(t,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e??{})}),u=null;try{u=await d.json()}catch{}if(!d.ok||!u||u.ok===!1){let i=new Error(u?.message??`HTTP ${d.status}`);throw i.reason=u?.reason??"failed",i.status=u?.status??d.status,i}return u}var p={status:()=>g("/nano-cloud-session/status"),config:(t,e={})=>g("/nano-cloud-session/config",{action:t,...e}),sessions:(t={})=>g("/nano-cloud-session/sessions",{op:"list",...t}),session:(t,e={})=>g("/nano-cloud-session/session",{op:t,...e}),create:t=>g("/nano-cloud-session/create",t),message:(t,e)=>g("/nano-cloud-session/message",{session_id:t,message:e}),archive:t=>g("/nano-cloud-session/archive",{session_id:t}),unarchive:t=>g("/nano-cloud-session/unarchive",{session_id:t}),terminate:t=>g("/nano-cloud-session/terminate",{session_id:t}),ssh:t=>g("/nano-cloud-session/ssh",{session_id:t})};var X=`
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
`,s=t=>String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),L=t=>{let e=Math.max(0,Date.now()/1e3-t);return e<60?`${e|0}s`:e<3600?`${e/60|0}m`:e<86400?`${e/3600|0}h`:`${e/86400|0}d`};function N(t,{t:e,pollIntervalMs:d=5e3}){let u=document.createElement("style");u.textContent=X,t.append(u);let i=document.createElement("div");i.className="dncs dncs-hidden",t.append(i);let a={tab:"sessions",profiles:[],activeId:null,self:null,sessions:[],cursor:null,hasMore:!1,selected:null,detail:null,transcript:[],transcriptAfter:null,showArchived:null,poll:!0,busy:!1,error:"",security:null,sshKey:null,sshInfo:null,notice:""};function f(r){let o=`reason_${r?.reason??""}`,l=e(o);return l!==o?l:r?.message??String(r)}let m=null;function h(){return a.error?`<div class="dncs-note err">${s(e("error"))}: ${s(a.error)}</div>`:""}function c(r){let o=r?.status??"unknown",l=r?.is_archived?` \xB7 ${e("archived")}`:"";return`<span class="dncs-badge ${s(o)}">${s(o)}${l}</span>`}function P(){i.querySelector(".dncs-head").innerHTML=`
      <b>${s(e("title"))}</b>
      <span class="dncs-tabs">
        <button class="dncs-tab" data-tab="sessions" data-on="${a.tab==="sessions"||a.tab==="detail"?1:0}">${s(e("tabSessions"))}</button>
        <button class="dncs-tab" data-tab="new" data-on="${a.tab==="new"?1:0}">${s(e("tabNew"))}</button>
        <button class="dncs-tab" data-tab="settings" data-on="${a.tab==="settings"?1:0}">${s(e("tabSettings"))}</button>
      </span>`}function A(){let r=a.sessions.map(o=>`
      <div class="dncs-row" data-selected="${a.selected===o.session_id?1:0}" data-id="${s(o.session_id)}">
        <div class="t">${s(o.title||o.session_id)}</div>
        <div class="m">${c(o)}<span>${s(o.devin_mode??"")}</span><span>${L(o.updated_at??o.created_at??0)}</span><span>${s(String(o.acus_consumed??"0"))} ACU</span></div>
      </div>`).join("");return`
      <div class="dncs-toolbar">
        <button class="dncs-btn" data-act="refresh">${s(e("refresh"))}</button>
        <label><input type="checkbox" data-act="poll" ${a.poll?"checked":""}> ${s(e("poll"))}</label>
        <label><input type="checkbox" data-act="archived" ${a.showArchived?"checked":""}> ${s(e("showArchived"))}</label>
      </div>
      ${h()}
      ${a.activeId?a.sessions.length===0?`<div class="dncs-note">${s(e("empty"))}</div>`:r:`<div class="dncs-note">${s(e("noProfile"))} <button class="dncs-btn primary" data-act="goto-settings" style="margin-left:8px">${s(e("gotoSettings"))}</button></div>`}
      ${a.hasMore?'<button class="dncs-btn" data-act="more">\u2026</button>':""}
      <div class="dncs-detail-slot"></div>`}function H(){let r=a.detail;if(!r)return"";let o=a.transcript.map(l=>`
      <div class="dncs-msg ${s(l.source)}">
        <div class="who"><span>${s(l.source==="user"?e("role_user"):l.source==="devin"?e("role_devin"):e("role_system"))}</span><span>${l.username?s(l.username):""}</span><span>${L(l.created_at??0)}</span></div>
        <div>${s(l.message)}</div>
      </div>`).join("");return`
      <div class="dncs-prof" style="margin-top:10px">
        <dl class="dncs-kv">
          <dt>id</dt><dd><code>${s(r.session_id)}</code></dd>
          <dt>${s(e("status"))}</dt><dd>${c(r)} ${s(r.status_detail??"")}</dd>
          <dt>ACU</dt><dd>${s(String(r.acus_consumed??"0"))}</dd>
          <dt>mode</dt><dd>${s(r.devin_mode??"")}</dd>
          <dt>url</dt><dd><a href="${s(r.url)}" target="_blank" rel="noreferrer">${s(r.url)}</a></dd>
        </dl>
        <div class="acts">
          <button class="dncs-btn" data-act="webapp">${s(e("openInWebapp"))}</button>
          <button class="dncs-btn" data-act="ssh">${s(e("sshCommand"))}</button>
          ${r.is_archived?`<button class="dncs-btn" data-act="unarchive">${s(e("unarchive"))}</button>`:`<button class="dncs-btn" data-act="archive">${s(e("archive"))}</button>`}
          <button class="dncs-btn danger" data-act="terminate">${s(e("terminate"))}</button>
        </div>
        ${O(r)}
      </div>
      <div class="dncs-msgs">${o}</div>
      <div class="dncs-msg-box">
        <input type="text" data-msg placeholder="${s(e("messagePlaceholder"))}">
        <button class="dncs-btn primary" data-act="send">${s(e("send"))}</button>
      </div>`}function U(){return`
      ${h()}
      <div class="dncs-field"><label>${s(e("prompt"))} *</label><textarea data-f="prompt" placeholder="${s(e("promptPlaceholder"))}"></textarea></div>
      <div class="dncs-field"><label>${s(e("titleField"))}</label><input data-f="title" type="text"></div>
      <div class="dncs-field"><label>${s(e("repos"))}</label><textarea data-f="repos" style="min-height:52px"></textarea><div class="dncs-hint">owner/repo \u2014 carrier \u5BF9 repos \u53EA\u505A\u6D45\u6821\u9A8C\uFF0C\u540D\u5B57\u5199\u9519\u4E5F\u4F1A 200</div></div>
      <div class="dncs-field"><label>${s(e("devinMode"))}</label>
        <select data-f="devin_mode"><option value="">default</option><option>lite</option><option>normal</option><option>fast</option><option>ultra</option><option>fusion</option></select></div>
      <div class="dncs-field"><label>${s(e("maxAcu"))}</label><input data-f="max_acu_limit" type="number" min="0"></div>
      <div class="dncs-field"><label><input data-f="resumable" type="checkbox" checked> ${s(e("resumable"))}</label></div>
      <button class="dncs-btn primary" data-act="create" ${a.busy?"disabled":""}>${s(e("create"))}</button>`}function O(r){let o=a.sshInfo;return!o||o.session_id!==r.session_id?"":`
      <div class="dncs-note" style="margin-top:8px">
        <div><b>${s(e("sshLane"))}</b></div>
        <div style="margin:4px 0"><code>${s(o.shell)}</code> <button class="dncs-btn" data-act="copy-ssh" data-v="shell">${s(e("copy"))}</button></div>
        <div class="dncs-hint">${s(e("forwardLabel"))}</div>
        <div><code>${s(o.forward)}</code></div>
        <div class="dncs-hint" style="margin-top:4px">${s(e("pubkeyLabel"))}</div>
        <div><code style="word-break:break-all">${s(o.publicKey)}</code> <button class="dncs-btn" data-act="copy-ssh" data-v="publicKey">${s(e("copy"))}</button></div>
        <div class="dncs-hint">${s(o.enrollHint)} \xB7 ${s(e("enrollSteps"))}</div>
      </div>`}function q(){let r=a.security,o=r?`
      <div class="dncs-prof">
        <b>${s(e("secTitle"))}</b>
        <dl class="dncs-kv" style="margin-top:6px">
          <dt>${s(e("secStore"))}</dt><dd><code>${s(r.storePath)}</code></dd>
          <dt>${s(e("secMode"))}</dt><dd>${s(r.storeMode??"\u2014")}</dd>
          <dt>${s(e("secEnv"))}</dt><dd>${s(r.seededFromEnv?e("secSeeded"):e("secNotSeeded"))} \xB7 <code>${s(r.envPath)}</code></dd>
          <dt>${s(e("secPolicy"))}</dt><dd>${s(r.secretPolicy)}</dd>
        </dl>
      </div>`:"",l=a.profiles.length===0?`
      <div class="dncs-prof" style="border-color:var(--dsw-alias-accent-primary,#4c8dff)">
        <b>${s(e("guideTitle"))}</b>
        <div class="dncs-hint" style="margin-top:6px">${s(e("guideStep1"))}</div>
        <div class="dncs-hint">${s(e("guideStep2"))}</div>
        <div class="dncs-hint">${s(e("guideStep3"))}</div>
      </div>`:"",b=`
      <div class="dncs-prof">
        <b>${s(e("sshLane"))}</b>
        <div class="acts"><button class="dncs-btn" data-act="ssh-key">${s(e("genKey"))}</button>
        ${a.sshKey?`<button class="dncs-btn" data-act="copy-ssh" data-v="sshKeyPub">${s(e("copy"))}</button>`:""}</div>
        ${a.sshKey?`<div style="margin-top:6px"><code style="word-break:break-all">${s(a.sshKey.publicKey)}</code></div>
          <div class="dncs-hint">${s(e("pubkeyLabel"))} \xB7 ${s(e("enrollSteps"))}</div>`:""}
      </div>`,$=a.profiles.map(n=>`
      <div class="dncs-prof" data-active="${n.active}">
        <b>${s(n.label)}</b>${n.active?` \xB7 <span class="dncs-badge running">${s(e("active"))}</span>`:""}
        <div class="m"><code>${s(n.orgId)}</code> \xB7 ${s(n.baseUrl)} \xB7 ${n.hasSecret?"token \u2022\u2022\u2022\u2022":"no token"}</div>
        <div class="acts">
          <button class="dncs-btn" data-act="test" data-id="${s(n.id)}">${s(e("test"))}</button>
          ${n.active?"":`<button class="dncs-btn" data-act="activate" data-id="${s(n.id)}">${s(e("activate"))}</button>`}
          ${n.active?"":`<button class="dncs-btn danger" data-act="del-profile" data-id="${s(n.id)}">${s(e("delete"))}</button>`}
        </div>
      </div>`).join("");return`
      ${h()}
      ${a.notice?`<div class="dncs-note">${s(a.notice)}</div>`:""}
      ${l}
      ${o}
      ${a.profiles.length===0?"":$}
      <div class="dncs-prof">
        <b>${s(e("profileNew"))}</b>
        <div class="dncs-field" style="margin-top:8px"><label>${s(e("label"))}</label><input data-p="label" type="text"></div>
        <div class="dncs-field"><label>${s(e("orgId"))}</label><input data-p="orgId" type="text" placeholder="org-\u2026"></div>
        <div class="dncs-field"><label>${s(e("token"))}</label><input data-p="secret" type="password" placeholder="cog_\u2026"><div class="dncs-hint">${s(e("tokenHint"))}</div></div>
        <div class="dncs-field"><label>${s(e("baseUrl"))}</label><input data-p="baseUrl" type="text" placeholder="https://api.devin.ai"></div>
        <button class="dncs-btn primary" data-act="save-profile">${s(e("save"))}</button>
      </div>
      ${b}`}function w(){i.querySelector(".dncs-head")||(i.innerHTML='<div class="dncs-head"></div><div class="dncs-body"></div>'),P();let r=i.querySelector(".dncs-body");if(a.tab==="sessions"||a.tab==="detail"?r.innerHTML=A():a.tab==="new"?r.innerHTML=U():r.innerHTML=q(),a.tab==="sessions"||a.tab==="detail"){let o=r.querySelector(".dncs-detail-slot");o&&a.detail&&(o.innerHTML=H())}}async function k(){let r=await p.status();a.profiles=r.profiles??[],a.activeId=r.activeId??null,a.activeId||(a.tab="settings");try{a.security=(await p.config("security")).security}catch{a.security=null}}async function y(){try{let r=await p.sessions({first:50,is_archived:a.showArchived===null?null:a.showArchived}),o=r.items??r.sessions??[];a.sessions=o,a.hasMore=!!r.has_next_page,a.cursor=r.end_cursor??null,a.error=""}catch(r){a.error=f(r)}}async function x(r,{keepScroll:o}={}){try{let[l,b]=await Promise.all([p.session("get",{session_id:r}),p.session("messages",{session_id:r,first:100})]);a.detail=l,a.transcript=(b.items??b.messages??[]).slice().sort(($,n)=>($.created_at??0)-(n.created_at??0)),a.error=""}catch(l){a.error=f(l)}}function _(){clearTimeout(m),!(!a.poll||a.tab==="settings")&&(m=setTimeout(async()=>{await y(),a.selected&&await x(a.selected),w(),_()},d))}i.addEventListener("click",async r=>{let o=r.target.closest(".dncs-tab");if(o){a.tab=o.dataset.tab,a.error="",w(),_();return}let l=r.target.closest(".dncs-row"),b=r.target.closest("[data-act]");if(l&&!b){a.selected=l.dataset.id,a.tab="detail",await x(a.selected),w();return}if(!b)return;let $=b.dataset.act;try{switch($){case"refresh":await y();break;case"poll":a.poll=b.checked,_();break;case"archived":a.showArchived=b.checked,await y();break;case"webapp":a.detail?.url&&window.open(a.detail.url,"_blank","noreferrer");return;case"goto-settings":a.tab="settings";break;case"ssh-key":{a.sshKey=await p.config("ssh-key");break}case"copy-ssh":{let n=b.dataset.v,v=n==="publicKey"?a.sshInfo?.publicKey:n==="sshKeyPub"?a.sshKey?.publicKey:a.sshInfo?.shell;v&&await navigator.clipboard?.writeText(v).catch(()=>{});break}case"ssh":{let n=await p.ssh(a.selected);a.sshInfo=n,await navigator.clipboard?.writeText(n.shell).catch(()=>{});break}case"archive":await p.archive(a.selected),await x(a.selected),await y();break;case"unarchive":await p.unarchive(a.selected),await x(a.selected),await y();break;case"terminate":window.confirm(e("terminateConfirm"))&&(await p.terminate(a.selected),a.selected=null,a.detail=null,a.tab="sessions",await y());break;case"send":{let n=i.querySelector("[data-msg]"),v=n.value.trim();v&&(await p.message(a.selected,v),n.value="",await x(a.selected));break}case"create":{a.busy=!0,w();let n=M=>i.querySelector(`[data-f="${M}"]`)?.value??"",v=n("repos").split(`
`).map(M=>M.trim()).filter(Boolean),C=await p.create({prompt:n("prompt"),title:n("title")||void 0,repos:v.length?v:void 0,devin_mode:n("devin_mode")||void 0,max_acu_limit:n("max_acu_limit")?Number(n("max_acu_limit")):void 0,resumable:i.querySelector('[data-f="resumable"]')?.checked,tags:["dsh-dncs"]});a.busy=!1;let T=C.session_id??C.id;T&&(a.selected=T,a.tab="detail",await x(T)),await y();break}case"save-profile":{let n=v=>i.querySelector(`[data-p="${v}"]`)?.value.trim()??"";await p.config("save",{profile:{label:n("label"),orgId:n("orgId"),baseUrl:n("baseUrl")||void 0,secret:n("secret")||void 0}}),await k();break}case"activate":await p.config("activate",{profileId:b.dataset.id}),await k();break;case"del-profile":await p.config("remove",{profileId:b.dataset.id}),await k();break;case"test":{let n=await p.config("test",{profileId:b.dataset.id}),v=n.orgMatch===!1?` \xB7 ${e("orgMatchWarn")} (${n.self?.devin_sessions_org_id??"?"})`:n.orgMatch===!0?` \xB7 ${e("orgMatchOk")}`:"";a.notice=`ok: ${n.self?.principal_type??""} ${n.self?.api_key_name??""} ${n.self?.devin_sessions_org_id??""}${v}`;break}}$!=="test"&&(a.notice=""),a.error=""}catch(n){a.error=f(n),a.busy=!1}w()});async function j(){try{await k(),a.activeId&&await y(),a.error=""}catch(r){a.error=f(r)}w(),_()}return j(),{toggle(){let r=i.classList.toggle("dncs-hidden");return r?clearTimeout(m):(k().then(()=>a.activeId?y():void 0).then(w).catch(()=>{}),_()),r},setShortcut(){},stopTheme(){},failed(r){a.error=String(r?.message??r),w()}}}var Y={title:"\u4E91\u4F1A\u8BDD",tabSessions:"\u4F1A\u8BDD",tabNew:"\u65B0\u5EFA",tabSettings:"\u8BBE\u7F6E",refresh:"\u5237\u65B0",loading:"\u52A0\u8F7D\u4E2D\u2026",empty:"\u6682\u65E0\u4F1A\u8BDD",create:"\u521B\u5EFA\u4F1A\u8BDD",prompt:"\u63D0\u793A\u8BCD",promptPlaceholder:"\u7ED9 Devin \u7684\u4EFB\u52A1\u63CF\u8FF0\u2026",titleField:"\u6807\u9898\uFF08\u53EF\u9009\uFF09",repos:"\u4ED3\u5E93\uFF08\u6BCF\u884C\u4E00\u4E2A owner/repo\uFF09",devinMode:"Agent \u6A21\u5F0F",maxAcu:"ACU \u4E0A\u9650\uFF08\u53EF\u9009\uFF09",resumable:"\u53EF\u6062\u590D\uFF08suspend \u540E\u4FDD\u7559 VM \u5FEB\u7167\uFF09",send:"\u53D1\u9001",messagePlaceholder:"\u5411\u8BE5\u4F1A\u8BDD\u53D1\u6D88\u606F\uFF08\u53EF\u5524\u9192\u6302\u8D77\u7684\u4F1A\u8BDD\uFF09\u2026",archive:"\u5F52\u6863",unarchive:"\u53D6\u6D88\u5F52\u6863",terminate:"\u4E2D\u6B62",terminateConfirm:"\u4E2D\u6B62\u8BE5 session\uFF1F\u8BB0\u5F55\u4ECD\u53EF\u8BFB\uFF0C\u4E0D\u662F\u786C\u5220\u9664\uFF1B\u5982\u9700\u6536\u5C3E\u8BF7\u518D\u70B9\u5F52\u6863\u3002",openInWebapp:"\u5728 Devin \u6253\u5F00",sshCommand:"SSH \u547D\u4EE4",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",profiles:"\u51ED\u8BC1\u914D\u7F6E",profileNew:"\u65B0\u589E\u914D\u7F6E",label:"\u540D\u79F0",orgId:"Org ID",token:"API Token",tokenHint:"cog_ \u524D\u7F00\u7684 PAT \u6216 service user key\uFF1B\u53EA\u5199\u5BBF\u4E3B\uFF0C\u4E0D\u56DE\u8BFB",baseUrl:"\u4E0A\u6E38 Base URL",save:"\u4FDD\u5B58",delete:"\u5220\u9664",activate:"\u8BBE\u4E3A\u5F53\u524D",test:"\u8FDE\u63A5\u6D4B\u8BD5",active:"\u5F53\u524D",status:"\u72B6\u6001",messages:"\u6D88\u606F",details:"\u8BE6\u60C5",noProfile:"\u5C1A\u672A\u914D\u7F6E carrier \u51ED\u8BC1\u2014\u2014\u5230\u300C\u8BBE\u7F6E\u300D\u65B0\u589E\u4E00\u4E2A profile\u3002",poll:"\u81EA\u52A8\u5237\u65B0",error:"\u9519\u8BEF",first:"\u6BCF\u9875\u6570\u91CF",archived:"\u5DF2\u5F52\u6863",showArchived:"\u663E\u793A\u5DF2\u5F52\u6863",role_user:"\u6211",role_devin:"Devin",role_system:"\u7CFB\u7EDF",guideTitle:"\u9996\u6B21\u914D\u7F6E",guideStep1:"\u2460 \u5728 Devin \u540E\u53F0 Settings \u2192 API \u751F\u6210\u4E00\u628A cog_ \u524D\u7F00\u7684 PAT\uFF0C\u7C98\u5230\u4E0B\u65B9 Token",guideStep2:"\u2461 \u628A\u540C\u4E00\u9875\u9762\u7684 Org ID\uFF08org-\u2026\uFF09\u586B\u5165 Org ID\uFF08org \u65E0\u6CD5\u88AB\u63A5\u53E3\u679A\u4E3E\uFF0C\u5FC5\u987B\u624B\u6284\uFF09",guideStep3:"\u2462 \u4FDD\u5B58\u540E\u70B9\u300C\u8FDE\u63A5\u6D4B\u8BD5\u300D\uFF0C\u770B\u5230 principal_type \u5373\u4E3A\u6253\u901A",gotoSettings:"\u53BB\u8BBE\u7F6E\u914D\u7F6E\u51ED\u8BC1",orgMatchOk:"org \u5F52\u5C5E\u4E00\u81F4",orgMatchWarn:"\u8B66\u544A\uFF1Atoken \u5F52\u5C5E org \u4E0E\u586B\u5165 org_id \u4E0D\u4E00\u81F4",sshLane:"SSH \u901A\u9053",genKey:"\u751F\u6210/\u67E5\u770B\u4E13\u7528\u516C\u94A5",pubkeyLabel:"\u516C\u94A5\uFF08\u7C98\u8D34\u5230 Devin Settings \u2192 SSH keys\uFF0C\u4E00\u6B21\u6027\uFF09",enrollSteps:"enroll \u662F\u8D26\u53F7\u7EA7\u4E00\u6B21\u6027\u6B65\u9AA4\uFF1Benroll \u540E ssh \u514D\u6279\u51C6\u76F4\u8FDE",forwardLabel:"\u7AEF\u53E3\u8F6C\u53D1\u6A21\u677F\uFF08-N \u4F1A\u88AB gateway \u65AD\u5F00\uFF0C\u5FC5\u987B\u5E26\u547D\u4EE4\u901A\u9053\uFF09",secTitle:"\u5B89\u5168\u72B6\u6001",secStore:"\u51ED\u8BC1\u6587\u4EF6",secMode:"\u6587\u4EF6\u6743\u9650",secEnv:"env \u79CD\u5B50",secPolicy:"token \u7B56\u7565",secSeeded:"\u5DF2\u79CD\u5B50",secNotSeeded:"\u672A\u79CD\u5B50","reason_no-active-profile":"\u672A\u914D\u7F6E carrier \u51ED\u8BC1\u2014\u2014\u5148\u5728\u8BBE\u7F6E\u9875\u65B0\u589E profile","reason_profile-not-found":"\u6307\u5B9A\u7684 profile \u4E0D\u5B58\u5728","reason_forbidden-or-invisible":"\u65E0\u6743\u8BBF\u95EE\u6216\u4F1A\u8BDD\u4E0D\u53EF\u89C1\uFF08\u4E0A\u6E38 403 fail-closed\uFF0C\u4E0D\u4EE3\u8868\u4E0D\u5B58\u5728\uFF09",reason_unauthorized:"\u51ED\u8BC1\u65E0\u6548\uFF08401\uFF09","reason_not-found":"\u8D44\u6E90\u4E0D\u5B58\u5728\uFF08404\uFF09",reason_conflict:"\u72B6\u6001\u51B2\u7A81\uFF08409\uFF09","reason_invalid-request":"\u8BF7\u6C42\u53C2\u6570\u65E0\u6548\uFF08422\uFF09","reason_rate-limited":"\u4E0A\u6E38\u9650\u901F\uFF08429\uFF09\uFF0C\u7A0D\u540E\u91CD\u8BD5","reason_upstream-error":"\u4E0A\u6E38\u9519\u8BEF\uFF085xx\uFF09",reason_unreachable:"\u65E0\u6CD5\u8FDE\u901A\u4E0A\u6E38\uFF08\u7F51\u7EDC/baseUrl\uFF09",reason_timeout:"\u4E0A\u6E38\u8D85\u65F6",reason_failed:"\u5BBF\u4E3B\u5185\u90E8\u9519\u8BEF"},D={title:"Cloud Sessions",tabSessions:"Sessions",tabNew:"New",tabSettings:"Settings",refresh:"Refresh",loading:"Loading\u2026",empty:"No sessions",create:"Create session",prompt:"Prompt",promptPlaceholder:"Task description for Devin\u2026",titleField:"Title (optional)",repos:"Repos (one owner/repo per line)",devinMode:"Agent mode",maxAcu:"ACU limit (optional)",resumable:"Resumable (keep VM snapshot after suspend)",send:"Send",messagePlaceholder:"Message this session (wakes suspended sessions)\u2026",archive:"Archive",unarchive:"Unarchive",terminate:"Terminate",terminateConfirm:"Terminate this session? The record stays readable \u2014 not a hard delete; archive afterwards to close it out.",openInWebapp:"Open in Devin",sshCommand:"SSH command",copy:"Copy",copied:"Copied",profiles:"Credentials",profileNew:"New profile",label:"Label",orgId:"Org ID",token:"API token",tokenHint:"cog_-prefixed PAT or service user key; stored host-side, never read back",baseUrl:"Upstream base URL",save:"Save",delete:"Delete",activate:"Activate",test:"Test",active:"active",status:"Status",messages:"Messages",details:"Details",noProfile:"No carrier credential yet \u2014 add a profile under Settings.",poll:"Auto-refresh",error:"Error",first:"Page size",archived:"archived",showArchived:"Show archived",role_user:"Me",role_devin:"Devin",role_system:"System",guideTitle:"First-time setup",guideStep1:"\u2460 Create a cog_-prefixed PAT in Devin Settings \u2192 API and paste it below",guideStep2:"\u2461 Copy the Org ID (org-\u2026) from the same page (orgs cannot be enumerated by API)",guideStep3:"\u2462 Save, then run Test \u2014 seeing principal_type means you are connected",gotoSettings:"Go to Settings to add credentials",orgMatchOk:"org matches the token",orgMatchWarn:"warning: the token resolves to a different org than the org_id you entered",sshLane:"SSH lane",genKey:"Generate / show dedicated public key",pubkeyLabel:"Public key (paste into Devin Settings \u2192 SSH keys, one-time)",enrollSteps:"enrollment is account-level and one-time; enrolled keys connect without approval",forwardLabel:"Port-forward template (-N is dropped by the gateway \u2014 keep a command channel)",secTitle:"Security",secStore:"Credential file",secMode:"File mode",secEnv:"env seed",secPolicy:"token policy",secSeeded:"seeded",secNotSeeded:"not seeded","reason_no-active-profile":"No carrier credential \u2014 add a profile in Settings first","reason_profile-not-found":"The requested profile does not exist","reason_forbidden-or-invisible":"Forbidden or invisible to you (upstream 403 fail-closed \u2014 does not prove absence)",reason_unauthorized:"Credential rejected (401)","reason_not-found":"Not found (404)",reason_conflict:"Conflict (409)","reason_invalid-request":"Invalid request (422)","reason_rate-limited":"Upstream rate limited (429) \u2014 retry later","reason_upstream-error":"Upstream error (5xx)",reason_unreachable:"Upstream unreachable (network/baseUrl)",reason_timeout:"Upstream timeout",reason_failed:"Host internal error"};function E(t){let e=()=>(t()??"en").startsWith("zh")?"zh":"en";return d=>(e()==="zh"?Y[d]:D[d])??D[d]??d}var ee=["slots","theme","locale","shortcuts"],ae="0.1.0";function se(t){return t==="mac"?"\u2318E\xB72":t==="windows"?"Alt+E\xB72":"Ctrl+E\xB72"}function z(t,e){return e==="mac"?t.metaKey&&!t.ctrlKey&&!t.altKey:e==="windows"?t.altKey&&!t.ctrlKey:t.ctrlKey&&!t.altKey}function te(t,e={}){let d=E(()=>t.locale.getSnapshot().active),u=()=>t.locale.getSnapshot().active?.startsWith("zh")?"\u4E91\u4F1A\u8BDD":"Cloud Sessions",i=t.shortcuts.platform,a;t.slots.inject("shell.overlay",()=>t.slots.register({name:"shell.overlay",id:"nano-cloud-session",order:50,inject:()=>({label:()=>`${u()} (${se(i)})`,ready:f=>{a=f}})},function({ready:m}){let h=I.default.useRef(null);return I.default.useEffect(()=>{let c=h.current;if(!c)return;let P=N(c,{t:d,pollIntervalMs:e.pollIntervalMs??5e3});return m(P),()=>{m(void 0),c.replaceChildren()}},[]),I.default.createElement("div",{ref:h,"data-nano-cloud-session":"root","data-version":ae})})),t.effect(()=>{let f=!1,m=c=>{if(!c.isComposing){if(c.code==="KeyE"){f=z(c,i)&&!c.shiftKey,f&&i==="windows"&&c.altKey===!0&&c.preventDefault();return}!f||c.code!=="Digit2"||c.repeat||!z(c,i)||c.shiftKey||(c.preventDefault(),c.stopPropagation(),a?.toggle())}},h=c=>{(c.code==="KeyE"||c.key==="Meta"||c.key==="Control"||c.key==="Alt")&&(f=!1)};return document.addEventListener("keydown",m,!0),document.addEventListener("keyup",h,!0),()=>{document.removeEventListener("keydown",m,!0),document.removeEventListener("keyup",h,!0)}})}return Q(re);})();
		return __dncsExport;
	}
});
