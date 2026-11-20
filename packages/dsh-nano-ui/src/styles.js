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

/* Generic panel skeleton (§6.3): scrollable layout, sections, fact grid. */
.nano-panel { box-sizing: border-box; block-size: 100%; min-block-size: 0; overflow: auto;
  padding: var(--nano-space-3); color: var(--dsw-alias-label-primary); overflow-wrap: anywhere;
  font: var(--dsw-font-s-14); }
.nano-panes > .nano-toolbar { flex: none; flex-wrap: wrap; font: var(--dsw-font-xs-13); }
.nano-panel-header, .nano-panel-section { display: grid; gap: var(--nano-space-2); margin-block-end: var(--nano-space-3); }
.nano-panel-header h2, .nano-panel-section h3 { margin: 0; font: var(--dsw-font-s-14); font-weight: 500; }
.nano-panel-header p { margin: 0; color: var(--dsw-alias-label-secondary); }
.nano-panel-kicker { font-size: var(--nano-desc-size, inherit); }
.nano-panel-section { padding-block: var(--nano-space-2); font: var(--dsw-font-s-14); }
.nano-panel-section > p { margin: 0; }
.nano-panel th { font: var(--dsw-font-xs-13); color: var(--dsw-alias-label-secondary); }
.nano-panel-section > pre { min-inline-size: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.nano-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: var(--nano-space-2); margin: 0; }
.nano-facts dt { color: var(--dsw-alias-label-secondary); }
.nano-facts dd { margin: 0; font-weight: 500; }
/* Card surface for a fact block. Host has no bordered card; layer-2 on the base, hairline, radius-lg. */
.nano-card { box-sizing: border-box; padding: var(--nano-space-3); background: var(--dsw-alias-bg-layer-2);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); }
/* Label on the left, control on the right, hairline between rows. */
.nano-split { display: flex; align-items: center; justify-content: space-between; gap: var(--nano-space-2); min-height: 32px;
  border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3); }
.nano-split-label { color: var(--dsw-alias-label-primary); }
.nano-split-control { flex: none; }
/* Usage track: 3px rail, fill only when a measurement exists. */
.nano-meter { display: grid; gap: 4px; }
.nano-meter-label { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.nano-meter-track { display: block; height: 3px; background: var(--dsw-alias-border-l3); }
.nano-meter-fill { display: block; height: 3px; background: var(--dsw-alias-state-business-primary); }
.nano-table { width: max-content; max-width: 100%; border-collapse: collapse; }
.nano-table th, .nano-table td { padding: 4px 16px 4px 0; text-align: left; white-space: nowrap; font: var(--dsw-font-xxxs-11); color: var(--dsw-alias-label-secondary); font-weight: 400; }
.nano-table th { color: var(--dsw-alias-label-tertiary); border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3); }
.nano-panel .nano-toolbar { flex-wrap: wrap; }
.nano-panel .nano-panes { height: auto; }
.nano-panel .nano-pane { overflow: visible; }
@media (pointer: coarse) {
  .nano-panel input,
  .nano-facts dt,
  .nano-facts dd { font-size: max(1em, 16px); }
  .nano-facts dd { font-weight: 500; }
}

/* Workbench shell. Heights match the measured design-mode pane: bar 38px,
   drawer 216px, status 26px. Tokens only; no card fill on the body. */
.nano-shell { position: relative; box-sizing: border-box; display: flex; flex-direction: column; height: 100%; min-height: 0;
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font: var(--dsw-font-xxs-12); }
.nano-shell-bar { position: relative; z-index: var(--nano-layer-local3); box-sizing: border-box; display: flex; flex: none; align-items: center;
  gap: var(--nano-space-2); height: 38px; padding: 5px 6px; border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3); }
/* DNK .nks-nav-toggle: one 28px pill, icon+label, markdown-tag fill, 4px inset so the left edge meets the host tab. */
.nano-shell-toggle { display: inline-flex; flex: none; align-items: center; gap: 5px; height: 28px; margin-left: 4px; padding: 0 10px;
  border: 0; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-markdown-tag); color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12); font-size: var(--dsh-content-font-size-secondary, 13px); white-space: nowrap; cursor: pointer; }
.nano-shell-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nano-shell-toggle[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-link) 14%, var(--dsw-alias-markdown-tag)); }
/* DNK .nks-toolbar-tail / .nks-tool: 28×28 seats, 8px pitch, under the host 分栏/全屏/收起 cluster. */
.nano-shell-tail { display: flex; flex: none; align-items: center; gap: 8px; }
.nano-shell-tool { width: 28px; height: 28px; display: inline-flex; flex: none; align-items: center; justify-content: center; padding: 0;
  border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nano-shell-tool:hover:not(:disabled) { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.nano-shell-tool[aria-pressed="true"] { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-link) 18%, transparent); }
.nano-shell-tool:disabled { opacity: .45; cursor: default; }
.nano-shell-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-13); }
.nano-shell-gap { flex: auto; }
.nano-shell-body { flex: auto; min-height: 0; overflow: auto; }
.nano-drawer { position: absolute; z-index: var(--nano-layer-local4); top: 44px; left: 10px; bottom: 36px; width: 216px; box-sizing: border-box;
  display: flex; flex-direction: column; min-height: 0; background: var(--dsw-alias-bg-layer-2);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg);
  box-shadow: var(--dsw-elevation-prominent); transform: translateX(calc(-100% - 12px)); visibility: hidden;
  transition: transform var(--ds-transition-duration-slow, .32s) var(--ds-ease-in-out, ease), visibility 0s linear var(--ds-transition-duration-slow, .32s); }
.nano-drawer[data-nano-drawer-state="open"] { transform: none; visibility: visible; transition: transform var(--ds-transition-duration-slow, .32s) var(--ds-ease-in-out, ease); }
@starting-style { .nano-drawer[data-nano-drawer-state="open"] { transform: translateX(calc(-100% - 12px)); } }
@media (prefers-reduced-motion: reduce) { .nano-drawer, .nano-drawer[data-nano-drawer-state="open"] { transition: none; } }
/* DNK .nks-nav-head: 30px, hairline under it, so the title is not the first row. */
.nano-drawer-head { display: flex; flex: none; align-items: center; height: 30px; padding: 0 10px; border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxxs-11); }
.nano-drawer-list { flex: auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: var(--nano-space-1); }
/* DNK .nks-nav-tab: one row, name ellipsizes, current row is its own markdown-tag plate. */
.nano-drawer-row { display: flex; align-items: center; gap: 7px; width: 100%; box-sizing: border-box; min-height: 30px; margin: 0; padding: 4px 8px;
  border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxs-12); text-align: left; cursor: pointer; }
.nano-drawer-row:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nano-drawer-row[aria-current="page"] { background: var(--dsw-alias-markdown-tag); color: var(--dsw-alias-label-primary); }
.nano-drawer-mark { display: inline-flex; flex: none; }
.nano-drawer-copy { display: flex; flex-direction: column; flex: auto; min-width: 0; }
.nano-drawer-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nano-drawer-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.nano-status { position: relative; z-index: var(--nano-layer-local3); flex: none; display: flex; align-items: center; gap: var(--nano-space-2);
  height: 26px; padding: 0 10px; border-top: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);
  font: var(--dsw-font-xxxs-11); color: var(--dsw-alias-label-tertiary); }
.nano-status-text { flex: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nano-status-actions { flex: none; display: flex; align-items: center; gap: var(--nano-space-1); }
.nano-status-btn { height: 20px; padding: 0 8px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent;
  color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.nano-status-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.nano-status-btn[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-link) 22%, transparent); color: var(--dsw-alias-label-primary); }
.nano-status-btn:disabled { opacity: .45; cursor: default; }
.nano-dock { position: relative; z-index: var(--nano-layer-local6); flex: none; display: flex; flex-direction: column; min-height: 88px;
  box-sizing: border-box; background: var(--dsw-alias-bg-base); border-top: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); }
.nano-dock-grip { position: absolute; left: 0; right: 0; top: -3px; height: 7px; cursor: row-resize; touch-action: none; }
.nano-dock-grip:hover { background: color-mix(in srgb, var(--dsw-alias-link) 35%, transparent); }
.nano-dock-body { flex: auto; min-height: 0; overflow: auto; padding: var(--nano-space-2); }
`
