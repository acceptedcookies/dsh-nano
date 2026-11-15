/**
 * Host-service resolution (flexibility hardening).
 *
 * The bundle must not assume the resolving domain provides `@deepseek-ai/*`
 * packages: the web dev profile's node_modules carries cordis, the desktop
 * profile's does not — and host-side resolution of profile bundles is not
 * contract-guaranteed. A static `import '@deepseek-ai/cordis'` in the seam
 * therefore breaks preset composition on hosts that resolve strictly inside
 * the profile tree (symptom: every agent preset fails to compose — sessions
 * unnamed, composer sealed).
 *
 * `HostService` resolves to the real cordis `Service` when the package is
 * reachable from the host's resolution domain (web dev / cli homes), and to a
 * semantic-equivalent fallback otherwise. The fallback reproduces the parts
 * of cordis `Service` the loader actually depends on:
 *
 *  - constructor registers the instance via `ctx.reflect.provide(name, this,
 *    this[symbols.check])` — `symbols.*` are `Symbol.for('cordis.*')` globals,
 *    so keys collide correctly with the host's own registry;
 *  - `[symbols.filter]` for isolate-bound visibility;
 *  - `[symbols.extend]` + `[symbols.resolveConfig]` used by extend/intercept;
 *  - `static init/check/config/invoke/extend/tracker/resolveConfig` keys so the
 *    plugin loader's `Service.init` style hooks line up;
 *  - `Symbol.hasInstance` chain walk so `x instanceof Service` still matches
 *    subclasses across the seam.
 *
 * Loading is dynamic (top-level await) so the static graph never references
 * `@deepseek-ai/*`; when cordis is present the real class wins and behavior is
 * byte-for-byte upstream.
 */

const SYMBOLS = {
  shadow: Symbol.for('cordis.shadow'),
  caller: Symbol.for('cordis.caller'),
  receiver: Symbol.for('cordis.receiver'),
  original: Symbol.for('cordis.original'),
  metadata: Symbol.for('cordis.metadata'),
  initHooks: Symbol.for('cordis.initHooks'),
  checkProto: Symbol.for('cordis.checkProto'),
  effect: Symbol.for('cordis.effect'),
  filter: Symbol.for('cordis.filter'),
  isolate: Symbol.for('cordis.isolate'),
  intercept: Symbol.for('cordis.intercept'),
  init: Symbol.for('cordis.init'),
  check: Symbol.for('cordis.check'),
  config: Symbol.for('cordis.config'),
  invoke: Symbol.for('cordis.invoke'),
  extend: Symbol.for('cordis.extend'),
  tracker: Symbol.for('cordis.tracker'),
  resolveConfig: Symbol.for('cordis.resolveConfig'),
}

function joinPrototype(proto1, proto2) {
  if (proto1 === Object.prototype) return proto2
  const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2))
  for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key))
  return result
}

function defineProperty(self, key, value) {
  Object.defineProperty(self, key, { configurable: true, writable: true, value })
}

/** Cordis Service fallback — mirrors cordis@4.1.0 lib Service semantics. */
class FallbackService {
  ctx
  static init = SYMBOLS.init
  static check = SYMBOLS.check
  static config = SYMBOLS.config
  static invoke = SYMBOLS.invoke
  static extend = SYMBOLS.extend
  static tracker = SYMBOLS.tracker
  static resolveConfig = SYMBOLS.resolveConfig
  name
  constructor(ctx, name) {
    this.ctx = ctx
    name ??= this.constructor['provide']
    let self = this
    const tracker = { associate: name, property: 'ctx' }
    if (self[SYMBOLS.invoke]) {
      // Callable services are rare for engines; keep Function.prototype join
      // semantics so hosts that expect callables still get one.
      self = Object.assign(function (...args) { return self[SYMBOLS.invoke].call(self, ...args) }, self)
      Object.setPrototypeOf(self, joinPrototype(Object.getPrototypeOf(this), Function.prototype))
    }
    self.ctx = ctx
    self.name = name
    defineProperty(self, SYMBOLS.tracker, tracker)
    self.ctx.reflect.provide(name, self, this[SYMBOLS.check])
    return self
  }
  [SYMBOLS.filter](ctx) {
    return ctx[SYMBOLS.isolate][this.name] === this.ctx[SYMBOLS.isolate][this.name]
  }
  [SYMBOLS.extend](props) {
    const self = this[FallbackService.invoke] ? Object.create(this) : Object.create(this)
    return Object.assign(self, props)
  }
  [SYMBOLS.resolveConfig](base, head) {
    let intercept = this.ctx[SYMBOLS.intercept]
    const configs = []
    while (intercept && this.name in intercept) {
      if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name])
      intercept = Object.getPrototypeOf(intercept)
    }
    if (base) configs.unshift(base)
    if (head) configs.push(head)
    if (this['Config']?.merge) return this['Config'].merge(...configs)
    return Object.assign({}, ...configs)
  }
  static [Symbol.hasInstance](instance) {
    if (!instance) return false
    let constructor = instance.constructor
    while (constructor) {
      constructor = constructor.prototype?.constructor
      if (constructor === this) return true
      constructor &&= Object.getPrototypeOf(constructor)
    }
    return false
  }
}

const imported = await import('@deepseek-ai/cordis').then(m => m.Service).catch(() => null)
export const HostService = imported ?? FallbackService
export const HOST_SERVICE_SOURCE = imported ? '@deepseek-ai/cordis' : 'vendored-fallback'
