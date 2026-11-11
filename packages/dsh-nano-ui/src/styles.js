/** Shared `nano-*` styles, all bound to shell `--dsw-*` tokens so every plugin follows the theme.
 * Exported as a string the plugin appends to its own stylesheet at build time. */

export const NANO_STYLES = `
/* ── anchored popup menu (NanoMenu, NanoMenuItem) ───────────────────────────── */
/* ── type tokens ──────────────────────────────────────────────────────────────
   Every shared surface reads from --nano-* custom properties so an owning
   plugin (e.g. the notepad) can retune typography by declaring them once on its
   own root. Each falls back to the shell default so nano-ui stays self-contained. */
.nano-menu { position: fixed; box-sizing: border-box; padding: 4px; display: flex; flex-direction: column; gap: 1px; z-index: 30;
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-3)); color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 12px);
  box-shadow: var(--dsw-elevation-prominent); backdrop-filter: var(--dsw-menu-backdrop-filter);
  font-family: var(--nano-font-family, inherit);
  font-size: var(--nano-font-size, inherit);
  line-height: var(--nano-line-height, inherit); }
.nano-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm, 8px); padding: 6px 8px;
  font: inherit; text-align: left; cursor: pointer; }
.nano-menu-item[data-active="true"], .nano-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nano-menu-item[data-tone="danger"] { color: var(--dsw-alias-label-error, #e5534b); }
.nano-menu-item[data-tone="danger"][data-active="true"] { background: color-mix(in oklab, var(--dsw-alias-label-error, #e5534b) 14%, transparent); }
.nano-menu-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; color: var(--dsw-alias-label-tertiary); }
.nano-menu-icon svg { display: block; width: 14px; height: 14px; }
.nano-menu-item[data-active="true"] .nano-menu-icon { color: inherit; }
.nano-menu-check { display: inline-flex; color: inherit; }
.nano-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── transient toast (NanoToast) ────────────────────────────────────────────── */
.nano-toast { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 40;
  padding: 6px 12px; border-radius: var(--dsw-radius-sm, 8px); font-size: var(--nano-toast-size, 12px);
  background: var(--dsw-alias-tooltip-bg, #43454a); color: var(--dsw-alias-tooltip-label, #f9fafb);
  box-shadow: var(--dsw-elevation-prominent); pointer-events: none; }
@keyframes nano-toast-in { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
.nano-toast { animation: nano-toast-in .12s ease; }

/* ── shared dialog helpers ──────────────────────────────────────────────────── */
.nano-dialog-host { position: fixed; inset: 0; z-index: 50; pointer-events: none;
  /* This host is only the React mount point — NanoDialog/Modal portals the card
     into document.body at a separate layer. Leaving pointer-events on here
     makes the empty fullscreen host sit above its own card and eat every click. */
  font-family: var(--nano-font-family, inherit);
  font-size: var(--nano-font-size, inherit);
  line-height: var(--nano-line-height, inherit); }
/* The Modal portals straight into document.body, outside .nano-dialog-host, so
   the card itself must consume the owner tokens — not the host. */
.nano-dialog-card { font-family: var(--nano-font-family, inherit); font-size: var(--nano-font-size, inherit); line-height: var(--nano-line-height, inherit); }
/* The Modal title is a hashed class — size it and the description through the
   shared tokens so dialogs read at the same scale as the owning surface. */
.nano-dialog-card [class*="title"], .nano-dialog-card [class*="title_"] { font-size: var(--nano-title-size, inherit); }
.nano-dialog-card [class*="description"], .nano-dialog-card [class*="description_"] { font-size: var(--nano-desc-size, inherit); color: var(--dsw-alias-label-secondary); }
/* Shell Button defaults to its own size; pull dialog actions down to the owner
   scale too so the whole card reads at one size. */
.nano-dialog-card button { font-size: var(--nano-font-size, inherit); font-family: var(--nano-font-family, inherit); }
.nano-dialog-error { margin: 8px 0 0; font-size: var(--nano-desc-size, 12px); color: var(--dsw-alias-danger, #cf222e); }
/* Height cap (e.g. 80% of the owning overlay): the card's own overflow:hidden
   clips nothing because the body becomes the flex child that scrolls. The last
   content child is .body — target it structurally since the class is hashed. */
.nano-dialog-capped { max-height: var(--nano-dlg-max) !important; }
/* Card width follows the owning overlay (e.g. 60% of the floating window) with
   a floor so a narrow window still leaves a readable dialog. The value itself
   is set per dialog on the portal layer (see openNanoDialog). */
.nano-dialog-sized { width: clamp(320px, var(--nano-dlg-w, 380px), 100%) !important; }

.nano-dialog-content { display: flex; flex-direction: column; flex: 1; min-height: 0; }
/* The shell Modal's body carries margin-top:20px on top of the header's own
   12px padding-bottom, so a title-only dialog floats its first row ~32px
   below the heading. Pull it back to the header's rhythm. */
.nano-dialog-card [class*="_body_"] { margin-top: 8px; }
/* The shell Button has no danger variant, so a destructive confirm was plain text
   with no hover. Keep the outline metrics and paint the warning color ourselves. */
.nano-modal-action.nano-modal-danger {
  color: var(--dsw-alias-state-error-primary, #f25a5a);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-state-error-primary, #f25a5a);
  transition: background-color .12s ease, color .12s ease, box-shadow .12s ease;
}
@media (hover: hover) {
  .nano-modal-action.nano-modal-danger:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover-danger, rgba(242, 90, 90, .15));
    color: var(--dsw-alias-state-error-secondary, #f25a5a);
    box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-state-error-secondary, #f25a5a);
  }
}
.nano-dialog-content > div:last-child { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
`
