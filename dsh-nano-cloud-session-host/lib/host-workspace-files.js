/**
 * [DNCSH] host row for the native external-session workspace file scopes: the patched
 * upstream service (lib/vendor/workspace-files, derived by scripts/build-overlay.mjs)
 * replaces the stock `workspace-files` row, which cordis.patch.yml disables. The
 * stock row's typert manifest was registered by typert-loader from the stock
 * package; this row registers the vendored manifest itself because the
 * loader only discovers `./typert` exports of a row's own package root.
 *
 * The row module is the service class itself (not a wrapper plugin), so a
 * config or constructor failure fails this Loader entry and shows in the
 * startup activation report.
 */
import WorkspaceFiles from './vendor/workspace-files/lib/index.js'
import { TYPERT } from './vendor/workspace-files/lib/typert.host.js'

export default class NanoCloudSessionHostWorkspaceFiles extends WorkspaceFiles {
  constructor(ctx, config) {
    super(ctx, config)
    ctx.effect(() => ctx.typert.register(TYPERT), 'nano-cloud-session-host: workspace-files typert')
  }
}
