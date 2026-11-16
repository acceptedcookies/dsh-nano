/** Shared `nano-*` styles. Colors, radii and shadows are host tokens only (DESIGN.md §2); layers and
 * spacing come from layers.js. Exported as a string each plugin appends to its own stylesheet. */
import { LAYER_CSS } from './layers.js'
import { VERSION } from './version.js'

export const NANO_STYLES = `/* dsh-nano-ui@${VERSION} */
${LAYER_CSS}
[data-nano-scheme="light"] { color-scheme: light; }
[data-nano-scheme="dark"] { color-scheme: dark; }

/* ── main-window dialog (NanoDialog over the host Modal) ───────────────────── */
.nano-dialog-card { color: var(--dsw-alias-label-primary); }
.nano-dialog-card.nano-dialog-w-480 { width: min(480px, 100%); }
.nano-dialog-card.nano-dialog-w-560 { width: min(560px, 100%); }
.nano-dialog-card.nano-dialog-w-720 { width: min(720px, 100%); }
.nano-dialog-body { display: flex; flex-direction: column; gap: var(--nano-space-2); min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nano-dialog-error { margin: var(--nano-space-2) 0 0; font-size: var(--nano-desc-size, inherit); color: var(--dsw-alias-state-error-primary); }
/* The host Button has no danger variant: keep the outline metrics, paint the error state. */
.nano-modal-action.nano-modal-danger {
  color: var(--dsw-alias-state-error-primary);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width) var(--dsw-alias-state-error-primary);
  transition: background-color .12s ease, color .12s ease, box-shadow .12s ease;
}
@media (hover: hover) {
  .nano-modal-action.nano-modal-danger:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover-danger);
    color: var(--dsw-alias-state-error-secondary);
    box-shadow: inset 0 0 0 var(--dsh-hairline-width) var(--dsw-alias-state-error-secondary);
  }
}

/* ── window overlay (NanoWindowDialog) ───────────────────────────────────────
   Positioned against the owner container; the owner layer may be pointer-events:none,
   so the overlay turns hit-testing back on. */
.nano-overlay { position: absolute; inset: 0; z-index: var(--nano-layer-overlay); box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; padding: var(--nano-space-3); pointer-events: auto;
  font-family: var(--nano-font-family, inherit); font-size: var(--nano-font-size, inherit); line-height: var(--nano-line-height, inherit); }
.nano-overlay-mask { position: absolute; inset: 0; background: var(--dsw-alias-bg-mask-1); border-radius: inherit; }
.nano-wdlg { position: relative; box-sizing: border-box; display: flex; flex-direction: column; gap: var(--nano-space-3);
  width: min(380px, 100%); max-height: 100%; padding: var(--nano-space-5); outline: none;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg);
  box-shadow: var(--dsw-elevation-prominent); }
.nano-wdlg-head { display: flex; align-items: center; justify-content: space-between; gap: var(--nano-space-2); }
.nano-wdlg-title { margin: 0; font-size: var(--nano-title-size, 1.1em); font-weight: 600; }
.nano-wdlg-desc { margin: 0; font-size: var(--nano-desc-size, inherit); color: var(--dsw-alias-label-secondary); }
.nano-wdlg-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: var(--nano-space-2); overflow-y: auto; overscroll-behavior: contain; }
.nano-wdlg-foot { display: flex; justify-content: flex-end; gap: var(--nano-space-2); }
.nano-wdlg button { font-family: inherit; }

/* ── menus (host Menu) ───────────────────────────────────────────────────── */
.nano-anchor { position: absolute; z-index: var(--nano-layer-menu); width: 0; height: 0; }
.nano-cap-120 { max-height: 120px; }
.nano-cap-160 { max-height: 160px; }
.nano-cap-200 { max-height: 200px; }
.nano-cap-240 { max-height: 240px; }
.nano-cap-320 { max-height: 320px; }
.nano-cap-400 { max-height: 400px; }
.nano-cap-480 { max-height: 480px; }

/* ── panels behind a SegmentedControl (NanoTabs) ─────────────────────────── */
.nano-panes { display: flex; flex-direction: column; gap: var(--nano-space-2); height: 100%; min-height: 0; }
.nano-pane { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nano-pane[hidden] { display: none; }

/* ── toolbar / empty state / window shell ────────────────────────────────── */
.nano-toolbar { display: flex; align-items: center; gap: var(--nano-space-1); min-height: 36px; padding: 0 var(--nano-space-2);
  border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l1); }
.nano-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--nano-space-2);
  padding: var(--nano-space-6); text-align: center; color: var(--dsw-alias-label-secondary); }
.nano-empty-icon { display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.nano-empty-title { margin: 0; color: var(--dsw-alias-label-primary); font-weight: 600; }
.nano-empty-desc { margin: 0; }
.nano-window { position: relative; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-panel);
  box-shadow: var(--dsw-elevation-panel); }
.nano-window-floating { position: fixed; z-index: var(--nano-layer-window); }
.nano-window-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.nano-window-body { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; }
`
