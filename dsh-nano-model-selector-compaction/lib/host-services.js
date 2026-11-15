/**
 * Host-service resolution — precise R-16 exception (P4-03).
 *
 * Retired: the vendored `FallbackService` that used to shadow cordis `Service`
 * when `@deepseek-ai/cordis` was not resolvable from the profile tree. A shadow
 * Service is exactly the second-author source CF1115 forbids — it reproduces
 * cordis reflection semantics (provide/check/filter/isolate/instanceof) so a
 * subclass *looks* like the real thing while diverging silently. R-16's scoped
 * exception covers the vendored compaction ENGINE + the accepted instanceof
 * downgrade only; it does NOT extend to re-implementing cordis `Service`.
 *
 * Contract now: `HostService` IS the real cordis `Service`, resolved through
 * the host's own resolution domain. When cordis is not reachable the module
 * throws on load — activation fails visibly rather than composing a preset on
 * a shadow class that was never upstream-validated. The comment that used to
 * defend the fallback is preserved below for archaeology.
 *
 * Historical: "the web dev profile's node_modules carries cordis, the desktop
 * profile's does not" was the fallback's justification. If cordis truly is
 * absent the takeover is unserviceable anyway — a preset that cannot extend
 * the real Service cannot run. Fail-closed is the correct behavior.
 */

let imported = null
let source = null
try {
  imported = await import('@deepseek-ai/cordis').then((m) => m.Service)
  source = '@deepseek-ai/cordis'
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

export const HOST_SERVICE_SOURCE = () => (source ?? (injected ? 'injected' : 'unresolved'))

/**
 * P4-03 / R-16 precise exception: a missing real Service is an ACTIVATION
 * FAILURE, not a silent fallback. resolveHostService() resolves the genuine
 * class; when neither the import nor an injected real class is present it
 * throws — the takeover cannot compose on a vendored shadow.
 */
export function resolveHostService() {
  const S = imported ?? injected
  if (typeof S === 'function') return S
  throw new Error(
    'dsh-nano-model-selector-compaction: cordis Service is not resolvable ' +
    '(neither @deepseek-ai/cordis nor an injected real class). The async-compaction ' +
    'takeover cannot run on a vendored fallback — activation fails closed.',
  )
}

/**
 * `HostService` is the name generated `compaction-seam.js` extends. It must be a
 * *class* at seam-eval time (you cannot `extend` a null), yet resolution may only
 * become possible later (setHostService in an offline test, or a lazily-wired
 * host domain). So HostService is a transparent LAZY subclass: `class X extends
 * HostService` binds fine at eval, and the FIRST construction resolves the real
 * Service and forwards `super(...)` to it. When resolution fails, constructing a
 * consumer throws — activation fails closed, never a shadow. `instanceof` walks
 * the resolved class so the /compact gate's check stays honest.
 */
export const HostService = class HostServiceLazy {
  constructor(...args) {
    // Resolve at construction — the only moment a real Service is needed. A
    // missing Service surfaces HERE (not at module eval) so offline fixtures
    // can setHostService() before first use. Returning an object from a derived
    // class's super call replaces `this`, so `class NanoCompactionEngine extends
    // CompactionEngine` ends up extending a REAL Service instance verbatim.
    const Real = resolveHostService()
    return Reflect.construct(Real, args, new.target ?? Real)
  }
  static [Symbol.hasInstance](instance) {
    try {
      const Real = resolveHostService()
      if (instance instanceof Real) return true
    } catch { /* unresolved — fall through to normal proto walk */ }
    return Function.prototype[Symbol.hasInstance].call(this, instance)
  }
}
