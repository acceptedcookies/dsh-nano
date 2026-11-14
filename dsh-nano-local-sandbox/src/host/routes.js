export const STATUS_ROUTE = '/nano-local-sandbox/status'
export const OPEN_ROUTE = '/nano-local-sandbox/open'
export const SHOT_ROUTE = '/nano-local-sandbox/shot'
export const HISTORY_ROUTE = '/nano-local-sandbox/history'
export const PICK_ROUTE = '/nano-local-sandbox/pick'
export const EDIT_ROUTE = '/nano-local-sandbox/edit'
export const SETTINGS_ROUTE = '/nano-local-sandbox/settings'
export const PERF_REVIEW_HOST_ROUTE = '/nano-local-sandbox/perf-review/host'
export const PERF_REPORT_ROUTE = '/nano-local-sandbox/perf-report'
export const KITE_ROUTE = '/nano-local-sandbox/kite'
export const CONSOLE_ROUTE = '/nano-local-sandbox/console'
export const OPERATIONS_ROUTE = '/nano-local-sandbox/operations'
export const DIAGNOSTICS_ROUTE = '/nano-local-sandbox/diagnostics'
export const MCP_ROUTE = '/nano-local-sandbox/mcp'
export const PORTS_ROUTE = '/nano-local-sandbox/ports'
export const RECOVER_ROUTE = '/nano-local-sandbox/recover'
export const DOM_ROUTE = '/nano-local-sandbox/dom'
export const SELFTEST_ROUTE = '/nano-local-sandbox/selftest'
export const ELEMENTS_ROUTE = '/nano-local-sandbox/elements'
export const BROWSE_HISTORY_ROUTE = '/nano-local-sandbox/browse-history'
export const NETWORK_ROUTE = '/nano-local-sandbox/network'
export const TARGETS_ROUTE = '/nano-local-sandbox/targets'
export const EVALUATE_ROUTE = '/nano-local-sandbox/evaluate'
export const WAIT_ROUTE = '/nano-local-sandbox/wait'
export const STORAGE_ROUTE = '/nano-local-sandbox/storage'
export const INTERACT_ROUTE = '/nano-local-sandbox/interact'
export const STATE_ROUTE = '/nano-local-sandbox/state'
export const HAR_ROUTE = '/nano-local-sandbox/har'
export const SNAPSHOT_ROUTE = '/nano-local-sandbox/snapshot'
export const REFS_ROUTE = '/nano-local-sandbox/refs'

import { ROUTE_TABLE } from '../../lib/route-table.js'
import { createCdpKeeper } from './cdp-keeper.js'
import { publishedHttpBase } from './backend-apple.js'
import { ensureClient, evaluatePage, navigate, readElements, withPage } from './cdp-elements.js'
import { answerNativeTool, toolsList } from './mcp-sandbox.js'

const keeper = createCdpKeeper()

function storageExpression(opts) {
  const scope = opts.scope === 'session' ? 'sessionStorage' : opts.scope === 'cookie' ? 'cookie' : 'localStorage'
  const op = opts.op || 'read'
  if (scope === 'cookie') {
    if (op === 'read') return `(()=>{const m={};for(const p of document.cookie.split('; ')){const i=p.indexOf('=');if(i>0)m[p.slice(0,i)]=p.slice(i+1)}return{entries:m}})()`
    if (op === 'set') return `(()=>{document.cookie=${JSON.stringify(`${opts.name}=${opts.value ?? ''}; path=/`)};return{ok:true}})()`
    return `(()=>{document.cookie=${JSON.stringify(`${opts.name || ''}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`)};return{ok:true}})()`
  }
  if (op === 'read') return `(()=>{const s=${scope};const m={};for(let i=0;i<s.length;i++){const k=s.key(i);m[k]=s.getItem(k)}return{entries:m}})()`
  if (op === 'set') return `(()=>{${scope}.setItem(${JSON.stringify(String(opts.name || ''))},${JSON.stringify(String(opts.value ?? ''))});return{ok:true}})()`
  if (op === 'delete') return `(()=>{${scope}.removeItem(${JSON.stringify(String(opts.name || ''))});return{ok:true}})()`
  return `(()=>{${scope}.clear();return{ok:true}})()`
}

function interactExpression(body) {
  const action = String(body.action || '').toLowerCase()
  const selector = String(body.selector || body.target || '')
  const arg = JSON.stringify({
    action,
    selector,
    text: body.text ?? body.value ?? '',
    key: body.key || '',
    option: body.option ?? '',
  })
  return `(()=>{
    const a=${arg};
    const el=document.querySelector(a.selector);
    if(!el)return{ok:false,errorId:'kitesurf.interact.miss',error:'no element matches '+a.selector};
    try{el.scrollIntoView({block:'center',inline:'center'})}catch{}
    const r=el.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    const top=document.elementFromPoint(cx,cy);
    const occluded=top&&top!==el&&!el.contains(top)&&!top.contains(el);
    if(!(r.width>0&&r.height>0))return{ok:false,errorId:'kitesurf.interact.invisible',error:'element has zero box'};
    if(occluded)return{ok:false,errorId:'kitesurf.interact.occluded',error:'covered by '+(top.id?'#'+top.id:top.tagName)};
    const fire=(type,init)=>{el.dispatchEvent(new (type.startsWith('key')?KeyboardEvent:type==='input'?InputEvent:MouseEvent)(type,Object.assign({bubbles:true,cancelable:true},init)))};
    const nativeSet=(o,v)=>{const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(o),'value');if(d&&d.set)d.set.call(o,v);else o.value=v};
    switch(a.action){
      case 'click': ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t=>fire(t,{clientX:cx,clientY:cy})); break;
      case 'dblclick': ['pointerdown','mousedown','pointerup','mouseup','click','dblclick'].forEach(t=>fire(t,{clientX:cx,clientY:cy})); break;
      case 'focus': el.focus(); break;
      case 'blur': el.blur(); break;
      case 'hover': ['pointerover','mouseover','pointermove','mousemove'].forEach(t=>fire(t,{clientX:cx,clientY:cy})); break;
      case 'fill': el.focus(); nativeSet(el,a.text); fire('input',{data:a.text,inputType:'insertText'}); fire('change'); break;
      case 'type': el.focus(); for(const ch of String(a.text)){fire('keydown',{key:ch});nativeSet(el,(el.value||'')+ch);fire('input',{data:ch,inputType:'insertText'});fire('keyup',{key:ch})} fire('change'); break;
      case 'press': ['keydown','keypress','keyup'].forEach(t=>fire(t,{key:a.key||'Enter'})); break;
      case 'select': if(el.tagName!=='SELECT')return{ok:false,errorId:'kitesurf.interact.type',error:'select only works on select'}; {const o=[...el.options].find(o=>o.value===a.option||o.text===a.option); if(!o)return{ok:false,errorId:'kitesurf.interact.option',error:'no option '+a.option}; nativeSet(el,o.value); fire('change');} break;
      case 'check': if(el.type!=='checkbox'&&el.type!=='radio')return{ok:false,errorId:'kitesurf.interact.type',error:'check only works on checkbox/radio'}; el.checked=true; fire('click'); fire('change'); break;
      case 'uncheck': if(el.type!=='checkbox')return{ok:false,errorId:'kitesurf.interact.type',error:'uncheck only works on checkbox'}; el.checked=false; fire('click'); fire('change'); break;
      default: return{ok:false,errorId:'kitesurf.interact.action',error:'unsupported action '+a.action};
    }
    return{ok:true,action:a.action,selector:a.selector,tag:el.tagName.toLowerCase()};
  })()`
}

function stateSaveExpression() {
  return `(()=>{const grab=s=>{const m={};for(let i=0;i<s.length;i++){const k=s.key(i);m[k]=s.getItem(k)}return m};return{localStorage:grab(localStorage),sessionStorage:grab(sessionStorage),cookie:document.cookie,url:location.href}})()`
}

function stateLoadExpression(state) {
  return `(()=>{const put=(s,o)=>{for(const [k,v] of Object.entries(o||{}))s.setItem(k,v)};put(localStorage,${JSON.stringify(state.localStorage || {})});put(sessionStorage,${JSON.stringify(state.sessionStorage || {})});return{ok:true}})()`
}

function snapshotExpression() {
  return `(()=>({url:location.href,title:document.title,count:document.querySelectorAll('*').length,tree:(document.body&&document.body.innerText||'').slice(0,500),refs:{},truncated:false}))()`
}

async function readJson(req) {
  if (req?.body && typeof req.body === 'object') return req.body
  const chunks = []
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
  }
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

async function ensureBase(session, deps) {
  if (session.httpBase) return session.httpBase
  if (!deps.backend?.inspect) return null
  try {
    const inspected = await deps.backend.inspect(session.containerName || 'kitesurf')
    const base = publishedHttpBase(inspected.raw ?? inspected)
    if (!base) return null
    if (session.phase === 'idle') session.phase = 'running'
    session.httpBase = base
    return base
  } catch {
    return null
  }
}

function send(res, status, body) {
  res.statusCode = status
  res.end(JSON.stringify(body))
}

export function routeSpecs(deps = {}) {
  const session = deps.session ?? { phase: 'idle', history: [] }
  return ROUTE_TABLE.map((row) => ({
    path: row.path,
    methods: [...row.methods],
    sessionBinding: true,
    bodyLimit: row.bodyLimit,
    async handler(req, res) {
      deps.onHandler?.()
      session.operations = session.operations || []
      session.operations.push({ path: row.path, method: req.method, at: new Date().toISOString() })
      if (session.operations.length > 200) session.operations.shift()
      if (row.path.endsWith('/shot') && deps.pageReady !== true) {
        res.statusCode = 502
        res.end(JSON.stringify({ ok: false, errorId: 'kitesurf.shot.empty' }))
        return
      }
      if (row.path.endsWith('/status')) {
        await ensureBase(session, deps)
        send(res, 200, { ok: session.phase === 'running', httpBase: session.httpBase ?? null, kite: { phase: session.phase } })
        return
      }
      if (row.path.endsWith('/kite')) {
        const body = await readJson(req)
        const action = body.action
        if (action === 'suspend' && session.phase === 'running') {
          await deps.backend?.stop?.(session.containerName)
          session.phase = 'suspended'
          send(res, 200, { ok: true, phase: session.phase })
          return
        }
        if ((action === 'resume' && session.phase === 'suspended') || (action === 'start' && session.phase === 'idle')) {
          await deps.backend?.start?.(session.containerName)
          session.phase = 'running'
          send(res, 200, { ok: true, phase: session.phase })
          return
        }
        send(res, 409, { ok: false, errorId: 'kitesurf.kite.state', phase: session.phase })
        return
      }
      if (row.path.endsWith('/open')) {
        const body = await readJson(req)
        if (typeof body.url === 'string' && body.url) {
          session.history.push({ url: body.url, at: new Date().toISOString() })
          const base = await ensureBase(session, deps)
          if (base) {
            try { await navigate(session, base, body.url) } catch { /* the history entry still stands */ }
          }
        }
        send(res, 200, { ok: true, url: body.url ?? null })
        return
      }
      if (row.path.endsWith('/selftest')) {
        const failed = session.phase === 'running' ? 0 : 1
        send(res, 200, { ok: failed === 0, failed, total: 1 })
        return
      }
      if (row.path.endsWith('/browse-history')) {
        send(res, 200, { ok: true, entries: session.history, source: 'plugin-store' })
        return
      }
      if (row.path.endsWith('/dom')) {
        const last = session.history.at(-1)
        send(res, last ? 200 : 502, last ? { ok: true, url: last.url } : { ok: false, errorId: 'kitesurf.dom.blank' })
        return
      }
      if (row.path.endsWith('/elements')) {
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const data = await (deps.captureElements ?? (async (base, options) => {
            base = base || await ensureBase(session, deps)
            if (!base) {
              const error = new Error('no engine page')
              error.status = 502
              error.errorId = 'kitesurf.elements.empty'
              throw error
            }
            const client = await ensureClient(session, base)
            return readElements(client, options)
          }))(deps.httpBase ?? session.httpBase, {
            selector: url.searchParams.get('selector') || '',
            depth: Number(url.searchParams.get('depth') || 4),
          })
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true, ...data }))
        } catch (error) {
          res.statusCode = error.status || 502
          res.end(JSON.stringify({ ok: false, errorId: error.errorId || 'kitesurf.elements.empty', error: error.message }))
        }
        return
      }
      if (row.path.endsWith('/mcp')) {
        const rpc = deps.rpc ?? await readJson(req)
        if (rpc.method === 'tools/list') {
          res.statusCode = 200
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, result: { tools: toolsList() } }))
          return
        }
        if (rpc.method === 'tools/call') {
          const answer = answerNativeTool(rpc.params?.name, deps.state ?? {})
          res.statusCode = answer.ok ? 200 : 404
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, result: answer }))
          return
        }
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, tools: toolsList().length }))
        return
      }
      if (row.path.endsWith('/storage') || row.path.endsWith('/interact') || row.path.endsWith('/state') || row.path.endsWith('/snapshot')) {
        try {
          const base = await ensureBase(session, deps)
          if (!base) {
            send(res, 502, { ok: false, errorId: 'kitesurf.elements.empty', error: 'no engine page' })
            return
          }
          const client = await ensureClient(session, base)
          const body = await readJson(req)
          if (row.path.endsWith('/storage')) {
            const scope = body.scope || new URL(req.url ?? '/', 'http://localhost').searchParams.get('scope') || 'local'
            const op = req.method === 'POST' ? (body.op || 'read') : 'read'
            const value = await evaluatePage(client, storageExpression({ ...body, scope, op }))
            send(res, 200, { ok: true, scope, op, result: value })
            return
          }
          if (row.path.endsWith('/interact')) {
            if (!body.selector && !body.target) {
              send(res, 400, { ok: false, errorId: 'kitesurf.interact.selector', error: 'target selector is required' })
              return
            }
            const value = await evaluatePage(client, interactExpression(body))
            if (value && value.ok === false) {
              send(res, 400, { ok: false, errorId: value.errorId || 'kitesurf.interact.fail', error: value.error || 'interact failed' })
              return
            }
            send(res, 200, { ok: true, ...(value || {}) })
            return
          }
          if (row.path.endsWith('/state')) {
            const action = body.action === 'load' ? 'load' : 'save'
            const value = await evaluatePage(client, action === 'save' ? stateSaveExpression() : stateLoadExpression(body.state || {}))
            send(res, 200, { ok: true, action, state: action === 'save' ? value : undefined, restored: action === 'load' ? value : undefined })
            return
          }
          const snap = await evaluatePage(client, snapshotExpression())
          session.refs = snap?.refs || {}
          send(res, 200, { ok: true, ...(snap || {}) })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
        }
        return
      }
      if (row.path.endsWith('/refs')) {
        const ref = new URL(req.url ?? '/', 'http://localhost').searchParams.get('ref')
        const refs = session.refs || {}
        if (ref) {
          if (!refs[ref]) {
            send(res, 404, { ok: false, errorId: 'kitesurf.ref.miss', error: `no element ref ${ref}` })
            return
          }
          send(res, 200, { ok: true, ref, ...refs[ref] })
          return
        }
        send(res, 200, { ok: true, refs })
        return
      }
      if (row.path.endsWith('/har')) {
        const entries = (session.network || []).slice(-100).map((item) => ({
          startedDateTime: item.at,
          time: 0,
          request: { method: item.method || 'GET', url: item.url || '' },
          response: { status: item.status || 0, statusText: '' },
        }))
        send(res, 200, { ok: true, log: { version: '1.2', creator: { name: 'dsh-nano-local-sandbox', version: '0' }, entries } })
        return
      }
      if (row.path.endsWith('/evaluate')) {
        const expression = deps.expression ?? ''
        const result = await keeper.evaluate(deps.instanceId, expression, deps.execute)
        res.statusCode = result.status
        res.end(JSON.stringify({ ok: result.ok, errorId: result.errorId ?? null, dom: result.dom }))
        return
      }
      const pageUrl = new URL(req.url ?? '/', 'http://localhost')
      const pageBody = req.method === 'GET' || req.method === 'HEAD' ? {} : await readJson(req)
      const page = async () => {
        const base = await ensureBase(session, deps)
        if (!base) {
          const error = new Error('no engine page')
          error.status = 502
          error.errorId = 'kitesurf.elements.empty'
          throw error
        }
        return ensureClient(session, base)
      }
      try {
        if (row.path.endsWith('/history')) {
          const delta = Number(pageBody.delta || 0)
          const client = await page()
          const value = await evaluatePage(client, `(()=>{history.go(${delta});return{ok:true,delta:${delta},url:location.href}})()`)
          send(res, 200, { ok: true, ...(value || {}) })
          return
        }
        if (row.path.endsWith('/pick')) {
          const client = await page()
          const selector = pageBody.selector || ''
          const expression = selector
            ? `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return{ok:false,errorId:'kitesurf.pick.miss'};const r=el.getBoundingClientRect();return{ok:true,tag:el.tagName.toLowerCase(),text:(el.innerText||'').slice(0,80),box:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`
            : `(()=>{const el=document.elementFromPoint(${Number(pageBody.x)||0},${Number(pageBody.y)||0});if(!el)return{ok:false,errorId:'kitesurf.pick.miss'};return{ok:true,tag:el.tagName.toLowerCase(),text:(el.innerText||'').slice(0,80)}})()`
          const value = await evaluatePage(client, expression)
          if (value && value.ok === false) {
            send(res, 404, value)
            return
          }
          send(res, 200, value || { ok: true })
          return
        }
        if (row.path.endsWith('/edit')) {
          const client = await page()
          const value = await evaluatePage(client, `(()=>{const el=document.querySelector(${JSON.stringify(pageBody.selector || '')});if(!el)return{ok:false,errorId:'kitesurf.edit.miss'};el.textContent=${JSON.stringify(String(pageBody.text || ''))};return{ok:true,tag:el.tagName.toLowerCase()}})()`)
          send(res, value && value.ok === false ? 404 : 200, value || { ok: true })
          return
        }
        if (row.path.endsWith('/settings')) {
          const client = await page()
          const viewport = pageBody.viewport
          if (viewport && viewport.width && viewport.height) {
            await withPage(client, (sessionId) => client.send('Emulation.setDeviceMetricsOverride', {
              width: Number(viewport.width),
              height: Number(viewport.height),
              deviceScaleFactor: Number(viewport.deviceScaleFactor || 1),
              mobile: viewport.mobile === true,
            }, sessionId))
          }
          send(res, 200, { ok: true, viewport: viewport || null })
          return
        }
        if (row.path.endsWith('/console')) {
          if (pageBody.clear === true) session.console = []
          const level = pageUrl.searchParams.get('level')
          const rows = (session.console || []).filter((item) => !level || item.level === level)
          send(res, 200, { ok: true, entries: rows.slice(-100) })
          return
        }
        if (row.path.endsWith('/operations')) {
          if (pageBody.clear === true) session.operations = []
          send(res, 200, { ok: true, entries: (session.operations || []).slice(-100) })
          return
        }
        if (row.path.endsWith('/diagnostics')) {
          await ensureBase(session, deps)
          send(res, 200, {
            ok: session.phase === 'running',
            httpBase: session.httpBase ?? null,
            kite: { phase: session.phase },
            console: (session.console || []).slice(-10),
            network: (session.network || []).slice(-10),
          })
          return
        }
        if (row.path.endsWith('/ports')) {
          await ensureBase(session, deps)
          send(res, 200, { ok: true, httpBase: session.httpBase ?? null, phase: session.phase })
          return
        }
        if (row.path.endsWith('/recover')) {
          const last = session.history.at(-1)
          if (!last) {
            send(res, 409, { ok: false, errorId: 'kitesurf.dom.blank', error: 'no page to recover' })
            return
          }
          const client = await page()
          await navigate(session, session.httpBase, last.url)
          send(res, 200, { ok: true, url: last.url })
          return
        }
        if (row.path.endsWith('/network')) {
          send(res, 200, { ok: true, entries: (session.network || []).slice(-100) })
          return
        }
        if (row.path.endsWith('/targets')) {
          const client = await page()
          const targets = await client.send('Target.getTargets')
          send(res, 200, { ok: true, targetInfos: targets.targetInfos || [] })
          return
        }
        if (row.path.endsWith('/wait')) {
          const client = await page()
          const selector = String(pageBody.selector || 'body')
          let found = null
          for (let attempt = 0; attempt < 4; attempt += 1) {
            found = await evaluatePage(client, `(()=>{const el=document.querySelector(${JSON.stringify(selector)});return el?{ok:true,tag:el.tagName.toLowerCase()}:{ok:false}})()`)
            if (found && found.ok) break
          }
          if (!found || found.ok !== true) {
            send(res, 504, { ok: false, errorId: 'kitesurf.wait.timeout', error: `selector did not match: ${selector}` })
            return
          }
          send(res, 200, found)
          return
        }
        if (row.path.endsWith('/perf-report')) {
          session.spans = session.spans || []
          session.spans.push({ at: new Date().toISOString(), ...pageBody })
          send(res, 200, { ok: true, count: session.spans.length })
          return
        }
        if (row.path.endsWith('/perf-review/host')) {
          send(res, 200, { ok: true, spans: session.spans || [] })
          return
        }
        send(res, 404, { ok: false, errorId: 'kitesurf.tool.unknown', error: row.path })
      } catch (error) {
        send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
      }
    },
  }))
}

/** WebSocket upgrade: rejection runs before any handshake. */
export function acceptUpgrade(req, socket, requestRejection, onHandshake) {
  const denied = requestRejection(req)
  if (denied !== undefined) {
    socket.statusCode = denied
    return { handshake: false, handled: false }
  }
  onHandshake(req, socket)
  return { handshake: true, handled: true }
}

export { keeper }
