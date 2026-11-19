/**
 * [DNCSH] host row for the native external-session Session views (externalSessions): the patched
 * upstream service (lib/vendor/session-controller, derived by scripts/build-overlay.mjs)
 * replaces the stock `session-controller` row, which cordis.patch.yml disables. The
 * stock row's typert manifest was registered by typert-loader from the stock
 * package; this row registers the vendored manifest itself because the
 * loader only discovers `./typert` exports of a row's own package root.
 *
 * The row module is the service class itself (not a wrapper plugin), so a
 * config or constructor failure fails this Loader entry and shows in the
 * startup activation report.
 */
import SessionController from './vendor/session-controller/lib/index.js'
import { TYPERT } from './vendor/session-controller/lib/typert.host.js'

export default class NanoCloudSessionHostSessionController extends SessionController {
  constructor(ctx, config) {
    super(ctx, config)
    ctx.effect(() => ctx.typert.register(TYPERT), 'nano-cloud-session-host: session-controller typert')
  }
}
