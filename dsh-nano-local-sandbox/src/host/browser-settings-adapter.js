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

function localeExpression(locale) {
  const lang = JSON.stringify(locale || 'en-US')
  return `(()=>{try{const langs=[${lang}];Object.defineProperty(navigator,'language',{get:()=>${lang},configurable:true});Object.defineProperty(navigator,'languages',{get:()=>langs,configurable:true})}catch{}return navigator.language})()`
}

function geolocationExpression(geo) {
  const value = geo ? JSON.stringify(geo) : 'null'
  return `(()=>{const g=${value};if(!g)return false;try{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok){return ok({coords:{latitude:g.latitude,longitude:g.longitude,accuracy:g.accuracy??20,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()})},watchPosition(ok){ok({coords:{latitude:g.latitude,longitude:g.longitude,accuracy:g.accuracy??20,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()});return 1},clearWatch(){}}})}catch{}return true})()`
}

function colorSchemeExpression(scheme) {
  const dark = scheme === 'dark'
  return `(()=>{const dark=${dark};try{document.documentElement.style.colorScheme=dark?'dark':'light'}catch{}try{const key='__nksOrigMatchMedia';if(!window[key])window[key]=window.matchMedia.bind(window);window.matchMedia=(query)=>{const q=String(query||'');if(q.includes('prefers-color-scheme')){return{matches:dark?q.includes('dark'):q.includes('light'),media:q,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}}}return window[key](query)}}catch{}return true})()`
}

function cookieParams(session, cookies) {
  const base = session.pageUrl || session.history?.at(-1)?.url || ''
  let origin
  try { origin = new URL(base).origin + '/' } catch { return [] }
  return String(cookies || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const at = line.indexOf('=')
    if (at < 1) return []
    return [{ name: line.slice(0, at).trim(), value: line.slice(at + 1).trim(), url: origin, path: '/' }]
  })
}

function invalid(message, errorId = 'kitesurf.body.json') {
  // The existing catalogue has no settings.* row. Do not invent an HTTP error id.
  return Object.assign(new Error(message), { status: 400, errorId })
}

function keysOnly(value, keys, label) {
  if (!object(value) || Object.keys(value).some(key => !keys.has(key))) throw invalid(`${label} contains unsupported fields or is not an object`)
}

function viewportPatch(value) {
  if (value === null) return null
  keysOnly(value, VIEWPORT_KEYS, 'viewport')
  if (!boundedInteger(value.width, 320, 3840)) throw invalid('viewport.width must be an integer in 320..3840')
  if (owns(value, 'height') && !boundedInteger(value.height, 240, 2160)) throw invalid('viewport.height must be an integer in 240..2160')
  if (owns(value, 'deviceScaleFactor') && ![1, 2, 3].includes(value.deviceScaleFactor)) throw invalid('deviceScaleFactor must be 1, 2 or 3')
  if (owns(value, 'mobile') && typeof value.mobile !== 'boolean') throw invalid('viewport.mobile must be a boolean')
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
  if (!object(value)) throw invalid('extraHeaders must be an object or null')
  const entries = Object.entries(value)
  if (entries.length > 20) throw invalid('extraHeaders allows at most 20 entries')
  const seen = new Set()
  for (const [name, header] of entries) {
    const lower = name.toLowerCase()
    // The pinned engine silently strips its private headers: reject, do not claim success.
    if (!/^[a-z0-9-]{1,64}$/i.test(name) || FORBIDDEN_HEADERS.has(lower) || lower.startsWith('x-kitesurf-') || seen.has(lower)) {
      throw invalid(`extraHeaders contains a forbidden, duplicate or invalid name: ${name}`)
    }
    if (typeof header !== 'string' || header.length > 200 || /[\u0000-\u0008\u000a-\u001f\u007f]/.test(header)) {
      throw invalid(`extraHeaders.${name} must be a single-line string of at most 200 characters`)
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
    if (ua !== null && (typeof ua !== 'string' || ua.length > 400 || /[\u0000-\u001f\u007f]/.test(ua))) {
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
    next.locale = locale === null ? 'en-US' : locale
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
    if (patch.colorScheme !== 'light' && patch.colorScheme !== 'dark') throw invalid('colorScheme must be light or dark')
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
    return ['Emulation.setDeviceMetricsOverride', effectiveViewport({ ...session, viewport: settings.viewport })]
  }
  if (key === 'userAgent') return ['Network.setUserAgentOverride', { userAgent: settings.userAgent ?? '' }]
  if (key === 'media') return ['Emulation.setEmulatedMedia', { media: settings.media ?? '' }]
  if (key === 'locale') return ['Runtime.evaluate', { expression: localeExpression(settings.locale), returnByValue: true }]
  if (key === 'geolocation') return ['Runtime.evaluate', { expression: geolocationExpression(settings.geolocation), returnByValue: true }]
  if (key === 'colorScheme') return ['Runtime.evaluate', { expression: colorSchemeExpression(settings.colorScheme), returnByValue: true }]
  if (key === 'cookies') return ['Network.setCookies', { cookies: cookieParams(session, settings.cookies) }]
  return ['Network.setExtraHTTPHeaders', { headers: settings.extraHeaders == null ? {} : { ...settings.extraHeaders } }]
}

async function transaction(client, sessionId, operations) {
  const attempted = []
  try {
    for (const operation of operations) {
      // A rejected/timed-out send may already have changed the engine.
      attempted.push(operation)
      await client.send(...operation.next, sessionId)
    }
  } catch (error) {
    const rollbackErrors = []
    for (const operation of attempted.reverse()) {
      try { await client.send(...operation.before, sessionId) } catch (failure) { rollbackErrors.push(failure) }
    }
    if (rollbackErrors.length) {
      const failure = new Error(`${error.message}; browser settings rollback failed: ${rollbackErrors.map(row => row.message).join('; ')}`, { cause: error })
      Object.assign(failure, { status: error.status || 502, errorId: error.errorId || 'kitesurf.engine.connect', rollbackErrors })
      throw failure
    }
    throw error
  }
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
    const operations = keys.map(key => ({ before: command(key, before, session), next: command(key, next, session) }))
    await withPage(client, sessionId => transaction(client, sessionId, operations))
    for (const key of keys) session[key] = next[key]
    return browserSettings(session)
  })
}

/** Replay on an attached/reconnected page before navigation. Never swallow a failed send. */
export function applyBrowserSettingsToPage(session, client, sessionId) {
  return serial(session, async () => {
    const settings = browserSettings(session)
    const keys = [...SETTINGS_KEYS].filter((key) => ['viewport', 'userAgent', 'media', 'extraHeaders'].includes(key) || session[key] !== undefined)
    const apply = async (id) => {
      for (const key of keys) await client.send(...command(key, settings, session), id)
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
    const operation = { before: ['Emulation.setDeviceMetricsOverride', before], next: ['Emulation.setDeviceMetricsOverride', next] }
    const apply = id => transaction(client, id, [operation])
    await (sessionId === undefined ? withPage(client, apply) : apply(sessionId))
    if (requested) session.lastFit = requested
    return { ...next }
  })
}
