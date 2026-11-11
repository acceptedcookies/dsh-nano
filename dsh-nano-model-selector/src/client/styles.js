/** Selector styles. Colors come from the active DSH theme tokens; shared `nano-*` rules come from dsh-nano-ui. */

import { NANO_STYLES } from 'dsh-nano-ui'

export const STYLE = `${NANO_STYLES}
.nms-root { position: relative; min-width: 0; }
/* The shared toast is position:absolute, anchored for relative page bodies; .nms-root is a
   small inline seat, so this plugin re-anchors it to the viewport like the old .nms-toast. */
.nms-root .nano-toast { position: fixed; bottom: 24px; z-index: 1300; }
.nms-trigger {
  display: flex; align-items: center; gap: 4px; min-width: 0; max-width: 360px; height: 28px;
  padding: 0 4px 0 8px; border: 0; border-radius: var(--dsw-radius-sm); outline: none;
  background: transparent; color: var(--dsw-alias-label-secondary);
  font-size: 13px; line-height: 20px; font-weight: 400; font-family: inherit; cursor: pointer;
}
.nms-trigger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.nms-trigger:focus-visible { box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); }
.nms-trigger:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-trigger-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: var(--dsh-composer-model-text-display, block); }
.nms-trigger-effort { flex-shrink: 1000; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-caption); display: var(--dsh-composer-model-text-display, block); }
.nms-trigger-icon { display: var(--dsh-composer-model-icon-display, none); flex: none; }
.nms-trigger-chevron { flex: none; color: var(--dsw-alias-label-caption); transition: transform 120ms ease; }
.nms-trigger-open .nms-trigger-chevron { transform: rotate(180deg); }
.nms-trigger-busy { box-sizing: border-box; width: 14px; height: 14px; flex: none; border-radius: 50%; border: 1.5px solid var(--dsw-alias-label-tertiary); border-top-color: transparent; animation: nms-spin .8s linear infinite; }

.nms-panel {
  box-sizing: border-box; position: fixed; z-index: 1200; display: flex; flex-direction: column;
  overflow: hidden; padding: 0; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-panel, 16px); background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary); box-shadow: var(--dsw-elevation-prominent);
  font-family: var(--dsw-font-family); font-size: 13px;
  animation: nms-pop 120ms ease-out; transform-origin: bottom right;
}
.nms-top { display: flex; align-items: center; gap: 10px; flex: none; height: 54px; box-sizing: border-box; padding: 0 14px; border-bottom: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); }
.nms-title { display: flex; align-items: center; gap: 8px; flex: none; min-width: 0; }
.nms-title-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-brand-primary); }
.nms-title-text { display: flex; flex-direction: column; min-width: 0; }
.nms-title-main { font-size: 13px; line-height: 18px; font-weight: 600; white-space: nowrap; }
.nms-title-sub { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.nms-search { position: relative; display: flex; align-items: center; gap: 6px; flex: 1; min-width: 120px; height: 34px; box-sizing: border-box; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-tertiary); transition: border-color 120ms ease, background 120ms ease; }
.nms-search:focus-within { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-1); }
.nms-search input { flex: 1; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; }
.nms-search input::placeholder { color: var(--dsw-alias-label-tertiary); }
.nms-search-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.nms-search-clear:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nms-icon-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-icon-button:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-body { display: flex; flex: 1; min-height: 0; }
.nms-rail { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; flex: none; width: 54px; box-sizing: border-box; padding: 8px 4px; border-right: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.nms-rail-brands { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-height: 0; width: 100%; overflow-y: auto; scrollbar-width: none; }
.nms-rail-brands::-webkit-scrollbar { display: none; }
.nms-rail-brands[data-more="true"] { -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 42px), transparent 100%); mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 42px), transparent 100%); }
.nms-rail-more { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; display: flex; align-items: center; justify-content: center; height: 22px; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; animation: nms-rail-bob 1.6s ease-in-out infinite; }
.nms-rail-more:hover { color: var(--dsw-alias-label-primary); }
@keyframes nms-rail-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
.nms-rail-item { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex: none; padding: 0; border: 1px solid transparent; border-radius: 10px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nms-rail-item:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-rail-item[data-active="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, var(--dsw-alias-border-l2)); background: transparent; color: var(--dsw-alias-label-primary); }
.nms-rail-item[data-favorite="true"] { color: #e6b84a; }
.nms-rail-sep { width: 24px; height: 1px; margin: 6px 0 5px; flex: none; background: var(--dsw-alias-border-l2); }
.nms-provider-mark { display: inline-flex; align-items: center; justify-content: center; width: 23px; height: 23px; border-radius: 7px; background: var(--nms-provider-bg, var(--dsw-alias-interactive-bg-active)); color: var(--nms-provider-fg, var(--dsw-alias-label-primary)); font-size: 10px; line-height: 1; font-weight: 700; letter-spacing: -.02em; }
.nms-provider-logo { display: inline-flex; align-items: center; justify-content: center; width: 23px; height: 23px; flex: none; overflow: hidden; }
.nms-provider-logo svg { display: block; width: 100%; height: 100%; }
.nms-provider-logo img { display: block; width: 100%; height: 100%; object-fit: contain; }
.nms-provider-logo-route { color: var(--dsw-alias-label-secondary); }
.nms-main { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.nms-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 10px 13px; scrollbar-gutter: stable both-edges; }
.nms-group { display: flex; align-items: center; gap: 6px; margin: 12px 0 6px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: .035em; }
.nms-group:first-child { margin-top: 4px; }
.nms-group-count { font-weight: 400; color: var(--dsw-alias-label-tertiary); }
.nms-group-star { color: #e6b84a; transform: translateY(-1px); }
.nms-model-row { display: flex; align-items: stretch; gap: 0; width: 100%; height: 64px; box-sizing: border-box; min-width: 0; margin: 0 0 4px; border-radius: var(--dsw-radius-md); }
.nms-model-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nms-model-row[data-active="true"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 24%, transparent); }
.nms-model-row[data-pending="true"] { opacity: .72; }
.nms-model-main { display: flex; align-items: center; gap: 10px; flex: 1; height: 100%; min-width: 0; padding: 6px 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; overflow: hidden; }
.nms-model-main:disabled { cursor: default; }
.nms-model-mark { flex: none; margin-top: 1px; }
.nms-drag-handle { display: inline-flex; align-items: center; justify-content: center; flex: none; align-self: center; box-sizing: border-box; width: 18px; height: 26px; margin: 0 4px 0 12px; padding: 0; border: 0; border-radius: var(--dsw-radius-xs, 4px); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: grab; opacity: .5; transition: opacity .12s ease; }
.nms-drag-handle svg { display: block; }
.nms-drag-handle:hover { opacity: 1; background: transparent; }
.nms-drag-handle:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px; opacity: 1; }
.nms-drag-handle:active { cursor: grabbing; }
.nms-model-row:hover .nms-drag-handle { opacity: 1; }
.nms-model-row[data-dragging] { opacity: .45; }
.nms-model-row[data-drop-target] { position: relative; }
.nms-model-row[data-drop-target="before"]::before,
.nms-model-row[data-drop-target="after"]::after { content: ""; position: absolute; left: 0; right: 0; height: 2px; border-radius: 1px; background: var(--dsw-alias-state-business-primary); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent); }
.nms-model-row[data-drop-target="before"]::before { top: -3px; }
.nms-model-row[data-drop-target="after"]::after { bottom: 1px; }
.nms-model-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; overflow: hidden; }
.nms-model-line { display: flex; align-items: center; flex-wrap: nowrap; gap: 6px; min-width: 0; overflow: hidden; }
.nms-model-name { min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 500; }
.nms-tag { display: inline-flex; align-items: center; height: 17px; padding: 0 5px; border-radius: 5px; background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 17px; font-weight: 500; white-space: nowrap; }
.nms-tag-info { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent); color: var(--dsw-alias-state-business-primary); }
.nms-tag-success { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent); color: var(--dsw-alias-state-success-primary); }
.nms-tag-warning { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, transparent); color: var(--dsw-alias-state-warn-primary); }
.nms-model-desc { display: block; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 16px; white-space: nowrap; text-overflow: clip; -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
.nms-model-meta { min-width: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 14px; text-overflow: ellipsis; white-space: nowrap; }
.nms-model-side { display: flex; align-items: center; gap: 4px; flex: none; padding: 0 8px 0 0; }
.nms-star { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.nms-star:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-star[data-active="true"] { color: #e6b84a; }
.nms-check { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--dsw-alias-state-business-primary); }
.nms-pending-dot { width: 10px; height: 10px; margin: 5px; border-radius: 50%; border: 1.5px solid var(--dsw-alias-label-tertiary); border-top-color: transparent; animation: nms-spin .8s linear infinite; }
.nms-empty, .nms-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 160px; padding: 20px; color: var(--dsw-alias-label-tertiary); font-size: 12px; text-align: center; }
.nms-empty-icon { display: inline-flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 10px; background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-tertiary); }
.nms-error { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 8px; padding: 8px 9px; border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color: var(--dsw-alias-state-error-primary); font-size: 11px; line-height: 16px; }
.nms-error-copy { flex: 1; min-width: 0; }
.nms-retry { flex: none; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 600; cursor: pointer; }
.nms-effort { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; flex: none; min-height: 46px; box-sizing: border-box; padding: 8px 14px; border-top: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.nms-effort-label { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; font-weight: 600; letter-spacing: .02em; }
.nms-effort-list { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-width: 0; }
.nms-effort-button { display: inline-flex; align-items: center; justify-content: center; height: 26px; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; cursor: pointer; }
.nms-effort-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-effort-button[data-active="true"] { border-color: var(--dsw-alias-state-business-primary); background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent); color: var(--dsw-alias-label-primary); }
.nms-effort-button:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-effort-note { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
@keyframes nms-spin { to { transform: rotate(360deg); } }
@keyframes nms-pop { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .nms-panel { animation: none; } .nms-trigger-chevron { transition: none; } }
`
