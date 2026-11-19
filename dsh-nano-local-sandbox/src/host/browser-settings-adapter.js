import { withPage } from './cdp-elements.js'

const SETTINGS_KEYS = new Set(['viewport', 'userAgent', 'media', 'extraHeaders', 'locale', 'geolocation', 'colorScheme', 'cookies'])
const VIEWPORT_KEYS = new Set(['width', 'height', 'deviceScaleFactor', 'mobile'])
const FORBIDDEN_HEADERS = new Set([
  'cookie', 'authorization', 'proxy-authorization', 'host', 'content-length',
  'connection', 'upgrade', 'te', 'trailer', 'transfer-encoding',
])
const flights = new WeakMap()
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const boundedInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max

/**
 * The one JS shim page the driver installs. It runs both as a
 * Page.addScriptToEvaluateOnNewDocument source (first scripts see it) and as a
 * direct Runtime.evaluate on the live document (settings changed mid-page).
 * Every override keeps the ORIGINAL descriptor so clearing restores the real
 * navigator/DOM instead of leaving a shim behind — a null patch must actually
 * undo, not silently keep lying to the page.
 */
function shimSource(settings) {
  return `(()=>{const S=${JSON.stringify({
    locale: settings.locale ?? null,
    geo: settings.geolocation ?? null,
    dark: settings.colorScheme === 'dark',
    hasScheme: settings.colorScheme === 'light' || settings.colorScheme === 'dark',
  })};const w=window,k='__nksShim';w[k]=w[k]||{orig:{}};const O=w[k].orig;
const patch=(obj,prop,desc)=>{try{const key=(obj===w.navigator?'nav:':'proto:')+prop;if(!(key in O))O[key]=Object.getOwnPropertyDescriptor(obj,prop);Object.defineProperty(obj,prop,desc);return true}catch{return false}};
const restore=(obj,prop)=>{try{const key=(obj===w.navigator?'nav:':'proto:')+prop;if(key in O){if(O[key])Object.defineProperty(obj,prop,O[key]);else delete obj[prop];delete O[key]}}catch{}};
// This pin keeps language/languages as OWN writable data properties on the
// navigator instance (Object.getPrototypeOf(navigator)!==Navigator.prototype),
// so a prototype-only getter patch is shadowed and silently dead. Patch both.
if(S.locale!==null){const lang=String(S.locale);const langs=[lang];for(const o of[Navigator.prototype,w.navigator]){patch(o,'language',{get:()=>lang,configurable:true});patch(o,'languages',{get:()=>langs.slice(),configurable:true})}}else{for(const o of[Navigator.prototype,w.navigator]){restore(o,'language');restore(o,'languages')}}
if(S.geo!==null){const g=S.geo;const pos=()=>({coords:{latitude:g.latitude,longitude:g.longitude,accuracy:g.accuracy??20,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()});const shim={getCurrentPosition(ok){Promise.resolve().then(()=>ok(pos()))},watchPosition(ok){Promise.resolve().then(()=>ok(pos()));return 1},clearWatch(){}};for(const o of[Navigator.prototype,w.navigator])patch(o,'geolocation',{configurable:true,get:()=>shim})}else{for(const o of[Navigator.prototype,w.navigator])restore(o,'geolocation')}
if(S.hasScheme){try{document.documentElement.style.colorScheme=S.dark?'dark':'light'}catch{};const mm=(query)=>{const q=String(query||'');if(/prefers-color-scheme/i.test(q)){return{matches:S.dark?q.includes('dark'):q.includes('light'),media:q,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}}}return O.matchMedia?O.matchMedia.call(w,q):{matches:false,media:q,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}}};if(!O.matchMedia)O.matchMedia=w.matchMedia?w.matchMedia.bind(w):null;try{w.matchMedia=mm}catch{}}else{try{if(O.matchMedia)w.matchMedia=O.matchMedia;delete O.matchMedia}catch{};try{document.documentElement.style.colorScheme=''}catch{}}
return{locale:navigator.language,dark:S.hasScheme?S.dark:null,geo:S.geo!==null}})()`
}

function cookieScope(session) {
  const base = session.pageUrl || session.history?.at(-1)?.url || ''
  try { return new URL(base).origin + '/' } catch { return '' }
}

function cookieParams(session, cookies) {
  const origin = cookieScope(session)
  if (!origin) return []
  return String(cookies || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const at = line.indexOf('=')
    if (at < 1) return []
    return [{ name: line.slice(0, at).trim(), value: line.slice(at + 1).trim(), url: origin, path: '/' }]
  })
}

function invalid(message, errorId = 'kitesurf.settings.body') {
  // The kitesurf.settings.* family IS the documented id space (diagnostics
  // catalog + recipes negative examples); a bare body.json left agents unable
  // to tell a settings-shape error from a malformed-body error.
  return Object.assign(new Error(message), { status: 400, errorId })
}

function keysOnly(value, keys, label) {
  if (!object(value) || Object.keys(value).some(key => !keys.has(key))) throw invalid(`${label} contains unsupported fields or is not an object`)
}

function viewportPatch(value) {
  if (value === null) return null
  keysOnly(value, VIEWPORT_KEYS, 'viewport')
  if (!boundedInteger(value.width, 320, 3840)) throw invalid('viewport.width must be an integer in 320..3840', 'kitesurf.settings.viewport')
  if (owns(value, 'height') && !boundedInteger(value.height, 240, 2160)) throw invalid('viewport.height must be an integer in 240..2160', 'kitesurf.settings.viewport')
  if (owns(value, 'deviceScaleFactor') && ![1, 2, 3].includes(value.deviceScaleFactor)) throw invalid('deviceScaleFactor must be 1, 2 or 3', 'kitesurf.settings.viewport')
  if (owns(value, 'mobile') && typeof value.mobile !== 'boolean') throw invalid('viewport.mobile must be a boolean', 'kitesurf.settings.viewport')
  return { ...value }
}

function completeViewport(value, previous) {
  return {
    width: value.width,
    height: value.height ?? (boundedInteger(previous?.height, 240, 2160) ? previous.height : 900),
    deviceScaleFactor: value.deviceScaleFactor ?? 1,
    mobile: value.mobile ?? false,
  }
}

function validateHeaders(value) {
  if (value === null) return null
  if (!object(value)) throw invalid('extraHeaders must be an object or null', 'kitesurf.settings.headers')
  const entries = Object.entries(value)
  if (entries.length > 20) throw invalid('extraHeaders allows at most 20 entries', 'kitesurf.settings.headers')
  const seen = new Set()
  for (const [name, header] of entries) {
    const lower = name.toLowerCase()
    // The pinned engine silently strips its private headers: reject, do not claim success.
    if (!/^[a-z0-9-]{1,64}$/i.test(name) || FORBIDDEN_HEADERS.has(lower) || lower.startsWith('x-kitesurf-') || seen.has(lower)) {
      throw invalid(`extraHeaders contains a forbidden, duplicate or invalid name: ${name}`, 'kitesurf.settings.headers')
    }
    if (typeof header !== 'string' || header.length > 200 || /[\u0000-\u0008\u000a-\u001f\u007f]/.test(header)) {
      throw invalid(`extraHeaders.${name} must be a single-line string of at most 200 characters`, 'kitesurf.settings.headers')
    }
    seen.add(lower)
  }
  return Object.fromEntries(entries)
}

function validatePatch(patch) {
  keysOnly(patch, SETTINGS_KEYS, 'settings')
  const next = {}
  if (owns(patch, 'viewport')) next.viewport = viewportPatch(patch.viewport)
  if (owns(patch, 'userAgent')) {
    const ua = patch.userAgent
    if (ua !== null && (typeof ua !== 'string' || ua.length > 400 || /[\u0000-\u0008\u000a-\u001f\u007f]/.test(ua))) {
      throw invalid('userAgent must be a single-line string of at most 400 characters or null')
    }
    next.userAgent = ua === null ? '' : ua.trim()
  }
  if (owns(patch, 'media')) {
    if (patch.media !== null && patch.media !== 'screen' && patch.media !== 'print') throw invalid('media must be screen, print or null')
    next.media = patch.media
  }
  if (owns(patch, 'extraHeaders')) next.extraHeaders = validateHeaders(patch.extraHeaders)
  if (owns(patch, 'locale')) {
    const locale = patch.locale
    if (locale !== null && (typeof locale !== 'string' || locale.length > 35 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale))) throw invalid('locale must be a language tag such as zh-CN, or null')
    next.locale = locale === null ? null : locale
  }
  if (owns(patch, 'geolocation')) {
    const geo = patch.geolocation
    if (geo !== null) {
      keysOnly(geo, new Set(['latitude', 'longitude', 'accuracy']), 'geolocation')
      if (!Number.isFinite(geo.latitude) || geo.latitude < -90 || geo.latitude > 90) throw invalid('geolocation.latitude must be -90..90')
      if (!Number.isFinite(geo.longitude) || geo.longitude < -180 || geo.longitude > 180) throw invalid('geolocation.longitude must be -180..180')
      if (owns(geo, 'accuracy') && (!Number.isFinite(geo.accuracy) || geo.accuracy < 0 || geo.accuracy > 100000)) throw invalid('geolocation.accuracy must be 0..100000')
    }
    next.geolocation = geo
  }
  if (owns(patch, 'colorScheme')) {
    if (patch.colorScheme !== 'light' && patch.colorScheme !== 'dark' && patch.colorScheme !== null) throw invalid('colorScheme must be light, dark or null')
    next.colorScheme = patch.colorScheme
  }
  if (owns(patch, 'cookies')) {
    const cookies = patch.cookies
    if (cookies !== null && (typeof cookies !== 'string' || cookies.length > 20000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(cookies))) throw invalid('cookies must be text of at most 20000 characters')
    next.cookies = cookies === null ? '' : cookies
  }
  return next
}

function validateFit(fit) {
  if (fit == null) return null
  if (!object(fit) || Object.keys(fit).some(key => key !== 'width' && key !== 'height') ||
      !boundedInteger(fit.width, 320, 3840) || !boundedInteger(fit.height, 240, 2160)) {
    throw invalid('fit must contain integer width 320..3840 and height 240..2160', 'kitesurf.shot.fit')
  }
  return { width: fit.width, height: fit.height }
}

/** Detached projection only; the session remains the sole writable settings source. */
export function browserSettings(session) {
  return {
    viewport: session.viewport == null ? null : { ...session.viewport },
    userAgent: session.userAgent ?? '',
    media: session.media ?? null,
    extraHeaders: session.extraHeaders == null ? null : { ...session.extraHeaders },
    ...(session.locale !== undefined ? { locale: session.locale } : {}),
    ...(session.geolocation !== undefined ? { geolocation: session.geolocation } : {}),
    ...(session.colorScheme !== undefined ? { colorScheme: session.colorScheme } : {}),
    ...(session.cookies !== undefined ? { cookies: session.cookies } : {}),
  }
}

/** Pure selection. A pane fit never replaces an explicitly fixed viewport. */
export function effectiveViewport(session, fit) {
  const requested = validateFit(fit)
  if (session.viewport != null) return completeViewport(viewportPatch(session.viewport))
  const auto = requested || validateFit(session.lastFit) || { width: 1280, height: 720 }
  return { ...auto, deviceScaleFactor: 1, mobile: false }
}

function serial(session, work) {
  const previous = flights.get(session)
  const flight = (previous ? previous.catch(() => {}) : Promise.resolve()).then(work).finally(() => {
    if (flights.get(session) === flight) flights.delete(session)
  })
  flights.set(session, flight)
  return flight
}

function command(key, settings, session) {
  if (key === 'viewport') {
    // clearDeviceMetricsOverride is unimplemented at the official pin, even though
    // it replies successfully. Restore known auto dimensions with a supported call.
    // deviceScaleFactor/mobile are accepted by the CDP signature but IGNORED by
    // the pin (dispatch.ts only applies width/height) — we still send them so a
    // rollback restores the exact prior engine values; capabilityNotes() reports
    // that they never take effect.
    const v = effectiveViewport({ ...session, viewport: settings.viewport })
    return ['Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile }]
  }
  if (key === 'userAgent') return ['Network.setUserAgentOverride', { userAgent: settings.userAgent ?? '' }]
  if (key === 'media') return ['Emulation.setEmulatedMedia', { media: settings.media ?? '' }]
  if (key === 'cookies') return ['Network.setCookies', { cookies: cookieParams(session, settings.cookies) }]
  if (key === 'extraHeaders') return ['Network.setExtraHTTPHeaders', { headers: settings.extraHeaders == null ? {} : { ...settings.extraHeaders } }]
  return null // locale/geolocation/colorScheme travel through the shim, not a CDP call
}

/** Runtime.evaluate results carry errors in-band; a resolved send is not success. */
function assertNoException(result) {
  if (result?.exceptionDetails) {
    const detail = result.exceptionDetails
    const error = new Error(String(detail.exception?.description || detail.text || 'settings shim failed').slice(0, 240))
    error.status = 502
    error.errorId = 'kitesurf.evaluate.exception'
    throw error
  }
  return result?.result?.value
}

/**
 * Refresh the pre-navigation shim for the next document AND re-run it on the
 * live document. The pin implements addScriptToEvaluateOnNewDocument
 * (preNavScripts, connection-scoped), which is the only way locale/geo/media
 * can exist before the page's own first script executes.
 */
async function applyShim(session, client, sessionId, settings, previousSettings) {
  const source = shimSource(settings)
  if (session.shimScriptId) {
    try { await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: session.shimScriptId }, sessionId) } catch { /* id may be stale after reconnect */ }
    session.shimScriptId = null
  }
  try {
    const added = await client.send('Page.addScriptToEvaluateOnNewDocument', { source }, sessionId)
    session.shimScriptId = added?.identifier || null
    const applied = await client.send('Runtime.evaluate', { expression: source, returnByValue: true }, sessionId)
    return assertNoException(applied)
  } catch (error) {
    // Half-applied shim is a real state: old script removed, new never took.
    // Restore the PREVIOUS shim source so the page isn't left shimless while
    // the transaction already committed new settings.
    if (previousSettings) {
      try {
        const restored = await client.send('Page.addScriptToEvaluateOnNewDocument', { source: shimSource(previousSettings) }, sessionId)
        session.shimScriptId = restored?.identifier || null
      } catch { /* restore is best effort; the thrown error still tells the truth */ }
    }
    throw error
  }
}

async function transaction(client, sessionId, operations) {
  const attempted = []
  try {
    for (const operation of operations) {
      // A rejected/timed-out send may already have changed the engine.
      attempted.push(operation)
      const result = await client.send(...operation.next, sessionId)
      if (operation.next[0] === 'Runtime.evaluate') assertNoException(result)
    }
  } catch (error) {
    const rollbackErrors = []
    for (const operation of attempted.reverse()) {
      try {
        const result = await client.send(...operation.before, sessionId)
        if (operation.before[0] === 'Runtime.evaluate') assertNoException(result)
      } catch (failure) { rollbackErrors.push(failure) }
    }
    if (rollbackErrors.length) {
      const failure = new Error(`${error.message}; browser settings rollback failed: ${rollbackErrors.map(row => row.message).join('; ')}`, { cause: error })
      Object.assign(failure, { status: error.status || 502, errorId: error.errorId || 'kitesurf.engine.connect', rollbackErrors })
      throw failure
    }
    throw error
  }
}

/**
 * Cookie clearing is real deletion, not an empty setCookies (the pin's jar
 * only adds — an empty list is a no-op). Every applied cookie name is
 * deleteCookies'd for the page scope; leftover session.cookiesApplied is the
 * record of what this driver actually wrote.
 */
async function clearAppliedCookies(session, client, sessionId) {
  const origin = cookieScope(session)
  const names = [...new Set(session.cookiesApplied || [])]
  // Per-name accounting: a mid-loop failure must keep the NOT-yet-deleted
  // names on the applied list so the NEXT clear can still reach them —
  // blanking the record strands jar entries forever.
  const remaining = []
  for (const name of names) {
    try {
      await client.send('Network.deleteCookies', { name, url: origin || undefined, path: '/' }, sessionId)
    } catch { remaining.push(name) }
  }
  session.cookiesApplied = remaining
}

/** Validate the entire patch first; issue one page transaction; commit only on success. */
export async function applyBrowserSettings(session, client, patch) {
  const validated = validatePatch(patch)
  return serial(session, async () => {
    const before = browserSettings(session)
    const next = { ...before, ...validated }
    if (validated.viewport) next.viewport = completeViewport(validated.viewport, before.viewport)
    const keys = [...SETTINGS_KEYS].filter(key => owns(validated, key))
    if (!keys.length) return before
    await withPage(client, async (sessionId) => {
      // The shim keys (locale/geolocation/colorScheme) are one pre-nav script +
      // one live evaluate — treat them as a single operation in the transaction.
      const shimKeys = keys.filter((key) => ['locale', 'geolocation', 'colorScheme'].includes(key))
      const operations = keys.filter((key) => command(key, next, session)).map((key) => ({
        before: command(key, before, session),
        next: command(key, next, session),
      }))
      if (shimKeys.length) {
        operations.push({
          before: ['Runtime.evaluate', { expression: shimSource(before), returnByValue: true }],
          next: ['Runtime.evaluate', { expression: shimSource(next), returnByValue: true }],
        })
      }
      await transaction(client, sessionId, operations)
      if (owns(validated, 'cookies')) {
        // Deleting first keeps the jar honest: stale names this driver set on
        // an earlier URL are removed before the new list is added. If the
        // setCookies write fails, delete what THIS patch just wrote — the
        // jar stays at 'before' instead of carrying a partial patch.
        const previousApplied = session.cookiesApplied || []
        await clearAppliedCookies(session, client, sessionId)
        if (next.cookies) {
          try {
            await client.send('Network.setCookies', { cookies: cookieParams(session, next.cookies) }, sessionId)
            session.cookiesApplied = cookieParams(session, next.cookies).map((row) => row.name)
          } catch (error) {
            for (const row of cookieParams(session, next.cookies)) {
              try { await client.send('Network.deleteCookies', { name: row.name, url: row.url || cookieScope(session) || undefined, path: '/' }, sessionId) } catch { /* best effort */ }
            }
            session.cookiesApplied = previousApplied
            throw error
          }
        }
        session.cookies = next.cookies
      }
      if (shimKeys.length) await applyShim(session, client, sessionId, next, before)
    })
    for (const key of keys) session[key] = next[key]
    return browserSettings(session)
  })
}

/**
 * Capability note the pane surfaces: this pin's setDeviceMetricsOverride only
 * applies width/height (dispatch.ts reads nothing else), so DSF and mobile
 * are reported as not-applied instead of echoing a value that never took.
 */
export function capabilityNotes(session) {
  const notes = []
  const v = session.viewport
  if (v && v.deviceScaleFactor && v.deviceScaleFactor !== 1) notes.push('deviceScaleFactor is accepted but ignored by this engine pin; devicePixelRatio stays 1')
  if (v && v.mobile === true) notes.push('mobile is accepted but ignored by this engine pin; no touch/mobile emulation')
  // Shim keys are JS-level simulation, not engine emulation: they cover the
  // APIs scripts read, not the network layer (Accept-Language) or a real IP.
  if (session.locale) notes.push('locale is simulated via JS shim: navigator.language/languages are patched, Accept-Language headers are not')
  if (session.geolocation) notes.push('geolocation is simulated via JS shim: navigator.geolocation reports the fix, no real IP/GPS involved')
  if (session.colorScheme) notes.push('colorScheme is applied via ks_color_scheme + matchMedia shim; prefers-contrast and other media queries are unaffected')
  return notes
}

/** Replay on an attached/reconnected page before navigation. Never swallow a failed send. */
export function applyBrowserSettingsToPage(session, client, sessionId) {
  return serial(session, async () => {
    const settings = browserSettings(session)
    const keys = [...SETTINGS_KEYS].filter((key) => ['viewport', 'userAgent', 'media', 'extraHeaders'].includes(key) || session[key] !== undefined)
    const apply = async (id) => {
      for (const key of keys) {
        const op = command(key, settings, session)
        if (op) await client.send(...op, id)
      }
      if (session.cookies) {
        await client.send('Network.setCookies', { cookies: cookieParams(session, session.cookies) }, id)
      }
      // Install the pre-nav shim only when a shim-key setting exists or a shim
      // is already in place — an empty script on every navigation is noise the
      // page doesn't need.
      if (session.locale !== undefined || session.geolocation !== undefined || session.colorScheme !== undefined || session.shimScriptId) {
        await applyShim(session, client, id, settings)
      }
      return browserSettings(session)
    }
    return sessionId === undefined ? withPage(client, apply) : apply(sessionId)
  })
}

/** Apply a shot's fit on the existing page; retain the latest pane size even in fixed mode. */
export async function applyViewport(session, client, fit, sessionId) {
  const requested = validateFit(fit)
  return serial(session, async () => {
    const before = effectiveViewport(session)
    const next = effectiveViewport(session, requested)
    const metricsParams = (v) => ({ width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile })
    const operation = { before: ['Emulation.setDeviceMetricsOverride', metricsParams(before)], next: ['Emulation.setDeviceMetricsOverride', metricsParams(next)] }
    const apply = id => transaction(client, id, [operation])
    await (sessionId === undefined ? withPage(client, apply) : apply(sessionId))
    if (requested) session.lastFit = requested
    return { ...next }
  })
}
