/**
 * Host-service resolution — precise R-16 exception (P4-03), second revision.
 *
 * CF1115 forbids a SECOND authority: the retired `FallbackService` shadowed
 * cordis `Service` by reproducing its semantics (provide/check/filter/isolate/
 * instanceof). That is gone for good — this module never synthesizes cordis
 * behavior. Every channel below returns the REAL `Service` class object,
 * reached through the host's own resolution domain:
 *
 *   1. `import('@deepseek-ai/cordis')` — the profile tree carries cordis
 *      (web profile, dev profiles).
 *   2. `createRequire(ctx.baseUrl)` — the plugin ctx inherits the preset
 *      layer's baseUrl (cordis-plugin-loader sets it on the config tree and
 *      propagates it to every row's ctx). Preset files live inside the
 *      app's own node_modules, so this require lands in the same module
 *      domain the host used to load its own builtins (desktop).
 *   3. Live-instance derivation — the isolate hands us real service objects
 *      (`ctx.get('sessions')` etc.); the cordis `Service` class sits on their
 *      prototype chain. We walk it and match the class by its static
 *      `Symbol.for('cordis.*')` markers — the object returned is the exact
 *      class the host itself instantiated, never a copy.
 *   4. `setHostService(service)` — test/fixture seam: the caller passes the
 *      genuine class it resolved in its own domain. Not a vendored impl.
 *
 * When none of these resolves, construction throws — activation fails closed
 * and visibly (R-16), never composes on a shadow.
 */

import { createRequire } from 'node:module'

let imported = null
let importedFrom = null
try {
  imported = await import('@deepseek-ai/cordis').then((m) => m.Service)
  importedFrom = '@deepseek-ai/cordis'
} catch {
  imported = null
}

// Legit loader seam: a test or host fixture may inject the REAL Service it
// resolved itself (the host's own resolution domain owns the class). This is
// NOT a vendored copy — the caller passes the genuine class reference.
// `setHostService` exists so offline tests compose NanoCompactionEngine against
// a faithful Service without shipping a shadow implementation.
let injected = null
export function setHostService(service) {
  if (typeof service !== 'function') {
    throw new Error('setHostService requires the real cordis Service class, not a value')
  }
  injected = service
}

let resolved = null
let resolvedFrom = null

export const HOST_SERVICE_SOURCE = () =>
  resolvedFrom ?? importedFrom ?? (injected ? 'injected' : 'unresolved')

/** The static marks cordis stamps on the real Service class. */
const SERVICE_MARKS = ['init', 'check', 'config', 'invoke', 'extend', 'tracker', 'resolveConfig']

function isRealServiceClass(candidate) {
  return typeof candidate === 'function'
    && candidate.name === 'Service'
    && SERVICE_MARKS.every((key) => candidate[key] === Symbol.for(`cordis.${key}`))
    && typeof candidate.prototype?.[Symbol.for('cordis.filter')] === 'function'
}

/** Walk a live service instance's prototype chain to its real Service class. */
function serviceClassFromInstance(instance) {
  let proto = (typeof instance === 'object' && instance !== null) || typeof instance === 'function'
    ? Object.getPrototypeOf(instance)
    : null
  while (proto !== null && proto !== Object.prototype) {
    const candidate = proto.constructor
    if (isRealServiceClass(candidate)) return candidate
    proto = Object.getPrototypeOf(proto)
  }
  return null
}

/** Channel 3: any provided service the isolate let us see is a real instance. */
const CONTEXT_SERVICE_NAMES = [
  'sessions', 'llm', 'tokenMeter', 'events', 'compaction', 'toolResultPruner', 'logger',
]

function serviceClassFromContext(ctx) {
  if (ctx == null) return null
  for (const name of CONTEXT_SERVICE_NAMES) {
    let value
    try { value = typeof ctx.get === 'function' ? ctx.get(name) : undefined } catch { value = undefined }
    if (value === undefined) {
      try { value = ctx[name] } catch { value = undefined }
    }
    const found = serviceClassFromInstance(value)
    if (found !== null) return found
  }
  return null
}

/** Channel 2: the preset layer's own baseUrl resolves inside the host domain. */
function serviceClassViaBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || baseUrl.length === 0) return null
  try {
    const mod = createRequire(baseUrl)('@deepseek-ai/cordis')
    return typeof mod?.Service === 'function' ? mod.Service : null
  } catch {
    return null
  }
}

/**
 * P4-03 / R-16 precise exception: a missing real Service is an ACTIVATION
 * FAILURE, not a silent fallback. `hostCtx` is the plugin's own ctx (the lazy
 * placeholder receives it as the constructor's first argument) — every late
 * channel reads the host's own objects through it.
 */
export function resolveHostService(hostCtx) {
  if (resolved !== null) return resolved
  const direct = imported ?? injected
  if (typeof direct === 'function') {
    resolved = direct
    resolvedFrom = importedFrom ?? 'injected'
    return resolved
  }
  const viaBaseUrl = serviceClassViaBaseUrl(hostCtx?.baseUrl)
  if (viaBaseUrl !== null) {
    resolved = viaBaseUrl
    resolvedFrom = 'ctx.baseUrl'
    return resolved
  }
  const derived = serviceClassFromContext(hostCtx)
  if (derived !== null) {
    resolved = derived
    resolvedFrom = 'ctx:service-instance'
    return resolved
  }
  throw new Error(
    'dsh-nano-model-selector-compaction: cordis Service is not resolvable ' +
    '(profile import, ctx.baseUrl require, and service-instance derivation all failed). ' +
    'The async-compaction takeover cannot run on a vendored fallback — activation fails closed.',
  )
}

/**
 * `HostService` is the name generated `compaction-seam.js` extends. It must be
 * a *class* at seam-eval time (you cannot `extend` a null), yet resolution may
 * only become possible at construction (ctx.baseUrl / service derivation need
 * the live ctx). So HostService is a LAZY PLACEHOLDER when the module-level
 * import missed: `class X extends HostService` binds at eval, and the FIRST
 * construction resolves the real Service through the host ctx, RE-LINKS the
 * placeholder's proto chain into `Real.prototype`, and Reflect.constructs a
 * genuine `Real` under the consumer's own new.target. The result is
 * `instanceof Real` AND `instanceof HostService` — the proto chain is
 * complete, not a shadow. When resolution fails, constructing throws —
 * activation fails closed, never a shadow.
 */
export const HostService = (imported == null && injected == null)
  ? class HostServiceLazy {
      constructor(...args) {
        // Resolve at construction — the only moment a real Service is needed.
        // args[0] is the plugin ctx the preset handed us: it carries the
        // preset layer's baseUrl and the isolate's provided service objects,
        // both part of the host's own resolution domain.
        const Real = resolveHostService(args[0])
        // The placeholder was defined BEFORE Real existed, so NEITHER side of
        // its extends chain is wired. `instanceof Real` is judged by Service's
        // own Symbol.hasInstance, which walks CLASS [[Prototype]]s — so both
        // links are needed to reproduce `class X extends Real` exactly:
        //   .prototype.__proto__ = Real.prototype → instance methods ([filter],
        //     [extend], [resolveConfig]) and the default proto walk;
        //   HostServiceLazy.__proto__ = Real    → Real's statics (check/
        //     extend/resolveConfig marks) AND the hasInstance constructor walk.
        // Every subclass already chains to HostServiceLazy on both sides, so
        // they gain the real ancestors too.
        if (!(HostServiceLazy.prototype instanceof Real) && HostServiceLazy.prototype !== Real.prototype) {
          Object.setPrototypeOf(HostServiceLazy.prototype, Real.prototype)
        }
        if (Object.getPrototypeOf(HostServiceLazy) !== Real) {
          Object.setPrototypeOf(HostServiceLazy, Real)
        }
        // Returning an object from a derived class's super call replaces
        // `this`; new.target keeps the consumer's own proto on TOP, so the
        // result is instanceof {subclass, CompactionEngine, HostService, Real}.
        return Reflect.construct(Real, args, new.target ?? Real)
      }
      static [Symbol.hasInstance](instance) {
        try {
          const Real = resolveHostService(undefined)
          if (instance instanceof Real) return true
        } catch { /* unresolved — fall through to normal proto walk */ }
        return Function.prototype[Symbol.hasInstance].call(this, instance)
      }
    }
  : (imported ?? injected)
