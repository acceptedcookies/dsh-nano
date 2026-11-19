/** Selector styles. Colors come from the active DSH theme tokens; shared `nano-*` rules come from dsh-nano-ui. */

import { NANO_STYLES } from 'dsh-nano-ui'

export const STYLE = `${NANO_STYLES}
.nms-root { position: relative; display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.nms-compact-badge { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; flex: none; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); cursor: pointer; }
.nms-compact-badge:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nms-compact-badge[aria-pressed="true"] { background: var(--dsw-alias-interactive-bg-active); }
.nms-ring { fill: none; stroke-linecap: round; }
.nms-ring-health { stroke: var(--dsw-alias-state-success-primary); stroke-width: 2.4; }
.nms-ring-buffer { stroke: var(--dsw-alias-state-warn-primary); stroke-width: 2.4; }
.nms-ring-pinned { stroke: var(--dsw-alias-state-business-primary); stroke-width: 2.4; }
.nms-trigger {
  display: flex; align-items: center; gap: 4px; min-width: 0; max-width: 360px; height: 28px;
  padding: 0 4px 0 8px; border: 0; border-radius: var(--dsw-radius-sm); outline: none;
  background: transparent; color: var(--dsw-alias-label-secondary);
  font-size: 13px; line-height: 20px; font-weight: 400; font-family: inherit; cursor: pointer;
}
.nms-trigger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.nms-trigger:focus-visible { box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); }
.nms-trigger:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
/* nano-ui-exempt: the next three --dsh-composer-model-*-display reads are the host slot contract of
   conversation.input.model (dsh-client-ui-conversation slots.d.ts), not --dsw tokens, so catalog/tokens.json has no entry. */
.nms-trigger-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: var(--dsh-composer-model-text-display, block); }
.nms-trigger-effort { flex-shrink: 1000; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-caption); display: var(--dsh-composer-model-text-display, block); }
.nms-trigger-icon { display: var(--dsh-composer-model-icon-display, none); flex: none; }
.nms-trigger-chevron { flex: none; color: var(--dsw-alias-label-caption); transition: transform 120ms ease; }
.nms-trigger-open .nms-trigger-chevron { transform: rotate(180deg); }
.nms-trigger-busy { box-sizing: border-box; width: 14px; height: 14px; flex: none; border-radius: 50%; border: 1.5px solid var(--dsw-alias-label-tertiary); border-top-color: transparent; animation: nms-spin .8s linear infinite; }

.nms-panel {
  box-sizing: border-box; position: fixed; z-index: var(--nano-layer-window); display: flex; flex-direction: column;
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
.nms-search-refresh { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.nms-search-refresh:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-search-refresh:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nms-icon-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-icon-button:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-icon-button[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-brand-primary); }
.nms-body { display: flex; flex: 1; min-height: 0; }
.nms-rail { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; flex: none; width: 54px; box-sizing: border-box; padding: 8px 4px; border-right: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.nms-rail-brands { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-height: 0; width: 100%; overflow-y: auto; scrollbar-width: none; }
.nms-rail-brands::-webkit-scrollbar { display: none; }
.nms-rail-brands[data-more="true"] { -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 42px), transparent 100%); mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 42px), transparent 100%); }
.nms-rail-more { position: absolute; left: 0; right: 0; bottom: 0; z-index: var(--nano-layer-overlay); display: flex; align-items: center; justify-content: center; height: 22px; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; animation: nms-rail-bob 1.6s ease-in-out infinite; }
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

/* ── async-compaction panel (-20) ─────────────────────────────────────────── */
.nms-compact { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 0 0 8px; }
.nms-compact-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); }
.nms-compact-card[data-enabled="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, var(--dsw-alias-border-l2)); }
.nms-compact-card-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nms-compact-card-desc { display: block; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 16px; white-space: nowrap; text-overflow: ellipsis; }
.nms-compact-pkg { font-size: 10px; line-height: 13px; color: var(--dsw-alias-label-tertiary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.nms-compact-top-actions { position: absolute; top: -1px; right: 0; z-index: var(--nano-layer-overlay); display: flex; align-items: center; gap: 6px; }
.nms-compact-confirm { height: 26px; padding: 0 12px; border: 0; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-label-primary-foreground); font: inherit; font-size: 12px; line-height: 26px; cursor: pointer; }
.nms-compact-confirm:disabled { opacity: .6; cursor: default; }
.nms-compact-chip { display: flex; align-items: center; gap: 6px; max-width: 300px; padding: 4px 8px; border-radius: var(--dsw-radius-sm); font-size: 11px; line-height: 15px; box-shadow: var(--dsw-elevation-soft); animation: nms-pop 120ms ease-out; }
.nms-compact-chip[data-kind="warn"] { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-state-warn-primary); }
.nms-compact-chip[data-kind="fail"] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-state-error-primary); }
.nms-compact-chip[data-kind="success"] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-state-success-primary); }
.nms-compact-chip-copy { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nms-compact-note { display: flex; align-items: flex-start; gap: 7px; padding: 8px 10px; border-radius: var(--dsw-radius-md); font-size: 11px; line-height: 15px; }
.nms-compact-note[data-kind="warn"] { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent); color: var(--dsw-alias-state-warn-primary); }
.nms-compact-note[data-kind="fail"] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color: var(--dsw-alias-state-error-primary); }
.nms-compact-note[data-kind="success"] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent); color: var(--dsw-alias-state-success-primary); }
.nms-compact-note-copy { flex: 1; min-width: 0; }
.nms-compact-note-actions { display: flex; gap: 6px; flex: none; }
.nms-compact-note-x { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: inherit; opacity: .7; cursor: pointer; }
.nms-compact-note-x:hover { opacity: 1; background: var(--dsw-alias-interactive-bg-hover); }
.nms-compact-fields { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.nms-compact-field { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; box-sizing: border-box; padding: 7px 12px; }
.nms-compact-fields > * + * { border-top: 1px solid var(--dsw-alias-border-l2); }
.nms-compact-field-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.nms-compact-field-label { flex: none; color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 16px; }
.nms-compact-field-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 15px; }
.nms-compact-section { display: flex; flex-direction: column; gap: 6px; }
.nms-compact-section-head { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 0 2px; }
.nms-compact-section-title { flex: none; color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; }
.nms-compact-section-hint { min-width: 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 15px; }
.nms-compact-presets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.nms-compact-preset { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer; }
.nms-compact-preset:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.nms-compact-preset[data-active="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, var(--dsw-alias-border-l2)); cursor: default; }
.nms-compact-preset:disabled { opacity: .6; cursor: default; }
.nms-compact-preset-name { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; line-height: 18px; }
.nms-compact-preset-desc { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 15px; }
.nms-compact-preset-vals { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 15px; font-variant-numeric: tabular-nums; }
.nms-compact-diff { display: flex; flex-direction: column; gap: 6px; }
.nms-compact-diff-row { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 8px; font-size: 12px; line-height: 16px; }
.nms-compact-diff-label { color: var(--dsw-alias-label-secondary); }
.nms-compact-diff-from { overflow: hidden; color: var(--dsw-alias-label-tertiary); text-decoration: line-through; white-space: nowrap; text-overflow: ellipsis; }
.nms-compact-diff-arrow { color: var(--dsw-alias-label-tertiary); }
.nms-compact-diff-to { color: var(--dsw-alias-label-primary); font-weight: 600; }
.nms-compact-diff-warn { margin-top: 2px; color: var(--dsw-alias-state-warn-primary); font-size: 11px; line-height: 15px; }
.nms-compact-facts { display: flex; flex-wrap: wrap; gap: 4px 14px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 15px; font-variant-numeric: tabular-nums; }
.nms-compact-field-static { flex: none; display: inline-flex; align-items: center; justify-content: flex-end; width: 124px; height: 26px; box-sizing: border-box; padding: 0 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; }
.nms-compact-input { width: 150px; height: 26px; box-sizing: border-box; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; font-variant-numeric: tabular-nums; }
.nms-compact-input-num { width: 124px; text-align: right; }
.nms-compact-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
select.nms-compact-input { flex: none; width: 210px; cursor: pointer; }
.nms-compact-value { flex: none; width: 124px; height: 26px; box-sizing: border-box; padding: 0 8px; border: 1px solid transparent; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; cursor: pointer; }
.nms-compact-prompt { display: flex; flex-direction: column; }
.nms-compact-prompt-body { display: flex; flex-direction: column; gap: 6px; padding: 0 12px 10px; }
.nms-compact-value-wide { width: auto; min-width: 124px; }
.nms-compact-prompt-text { box-sizing: border-box; width: 100%; min-height: 140px; padding: 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; line-height: 16px; resize: vertical; }
.nms-compact-prompt-actions { display: flex; justify-content: flex-end; gap: 6px; }
.nms-compact-value:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-interactive-bg-hover); }
.nms-compact-value:disabled { cursor: default; }
.nms-compact-runtime { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.nms-compact-meter-row { display: flex; align-items: center; gap: 10px; }
.nms-compact-meter { position: relative; flex: 1; height: 5px; border-radius: 3px; background: var(--dsw-alias-interactive-bg-active); overflow: hidden; }
.nms-compact-meter-fill { position: absolute; inset: 0 auto 0 0; border-radius: 3px; background: var(--dsw-alias-state-business-primary); transition: width .3s; }
.nms-compact-meter-fill[data-level="mid"] { background: var(--dsw-alias-state-warn-primary); }
.nms-compact-meter-fill[data-level="high"] { background: var(--dsw-alias-state-error-primary); }
.nms-compact-meter-num { flex: none; min-width: 40px; text-align: right; color: var(--dsw-alias-label-secondary); font-size: 12px; font-variant-numeric: tabular-nums; }
.nms-compact-meta-row { display: flex; }

.nms-compact-explain { display: flex; flex-direction: column; gap: 6px; padding: 9px 12px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.nms-explain-head { display: flex; flex-direction: column; align-items: stretch; gap: 8px; }
.nms-explain-body { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; }
/* ── async-compaction status badge (session header) ─────────────────────────
   A quiet pill in the header's action area. It is session state, not input
   state, so it must read as a label rather than as a control: no border on
   hover, no pointer affordance, and the glyph alone carries the tone. */
.nms-badge { display: inline-flex; align-items: center; gap: 5px; flex: none;
  height: 24px; padding: 0 8px; border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-bg-layer-1, #202020);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-border-l2);
  font-size: 11px; line-height: 1; color: var(--dsw-alias-label-secondary);
  white-space: nowrap; cursor: default; }
.nms-badge-glyph { display: inline-flex; align-items: center; justify-content: center; flex: none; }
.nms-badge-glyph svg { display: block; }
.nms-badge[data-state="armed"] .nms-badge-glyph { color: var(--dsw-alias-state-business-primary); }
.nms-badge[data-state="running"] .nms-badge-glyph { color: var(--dsw-alias-state-warn-primary);
  animation: nms-pulse 1.4s ease-in-out infinite; }
.nms-badge[data-state="committed"] .nms-badge-glyph { color: var(--dsw-alias-state-success-primary, #3fb950); }
.nms-badge[data-state="failed"] .nms-badge-glyph { color: var(--dsw-alias-state-error-primary, #f25a5a); }
.nms-badge[data-state="failed"] { color: var(--dsw-alias-state-error-primary, #f25a5a); }
@keyframes nms-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .nms-badge[data-state="running"] .nms-badge-glyph { animation: none; } }

/* History timeline marker: a static square, deliberately NOT a StateDot ring —
   a historical record must never look like an in-flight spinner. */
.nms-hist-row-mark { flex: none; width: 6px; height: 6px; border-radius: 2px;
  background: var(--dsw-alias-label-tertiary); }
.nms-hist-row-mark[data-tone="success"] { background: var(--dsw-alias-state-success-primary, #3fb950); }
.nms-hist-row-mark[data-tone="danger"] { background: var(--dsw-alias-state-error-primary, #f25a5a); }
.nms-hist-row-mark[data-tone="info"] { background: var(--dsw-alias-state-business-primary); }
.nms-hist-row-mark[data-tone="warning"] { background: var(--dsw-alias-state-warn-primary); }

/* ── async-compaction history dialog ─────────────────────────────────────────
   NanoDialog fixes the height of its own body (fixedHeight); the card fills it
   and only the tab panel scrolls. */
.nms-hist-dialog .nano-dialog-body { display: flex; flex-direction: column; }
.nms-hist-dialog .nms-hist { flex: 1; min-height: 0; }
.nms-hist-dialog .nms-hist-panel { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
/* ── async-compaction history card ─────────────────────────────────────────
   Every value is a shell token: the card must follow the active theme without
   a second palette. Layout only — no control is restyled here. */
.nms-hist { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
/* Verdict: the plain-language answer, read before any number. No tone accent —
   the left colour bar was a hand-drawn marker nano-ui does not have, removed
   2026-11-19 on owner review; data-tone stays as neutral metadata only. */
.nms-hist-verdict { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-bg-layer-1, #202020); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; }
.nms-hist-verdict p { margin: 0; }
.nms-hist-water { display: flex; flex-direction: column; gap: 0; }
.nms-hist-water-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; }
.nms-hist-water-label { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nms-hist-water-value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary); line-height: 22px; }
.nms-hist-water-used { font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
/* The provenance tag sits beside the number, not in a caption on the far side:
   it qualifies the value it is next to. */
.nms-hist-water-source { font-size: 11px; color: var(--dsw-alias-label-tertiary);
  padding: 1px 6px; border-radius: 999px; background: var(--dsw-alias-bg-layer-1, #202020);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-border-l2); }
.nms-hist-live { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--dsw-alias-state-business-primary); }
.nms-hist-live-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: nms-pulse 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .nms-hist-live-dot { animation: none; } }
/* Axis row: one label per threshold, anchored at its own position so the
   reader never has to match a legend to a tick. */
.nms-hist-axis { position: relative; height: 14px; margin-top: 4px; }
.nms-hist-axis-label { position: absolute; top: 0; font-size: 10px; line-height: 12px;
  white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }
.nms-hist-axis-label[data-tone="health"] { color: var(--dsw-alias-state-success-primary, #3fb950); }
.nms-hist-axis-label[data-tone="buffer"] { color: var(--dsw-alias-state-warn-primary); }
.nms-hist-axis-label[data-tone="safety"] { color: var(--dsw-alias-state-error-primary, #f25a5a); }
/* Track = the four zones the engine acts on; the fill is a thin bar on top
   ending in a pointer, so the zone colour under it stays readable. */
.nms-hist-water-track { position: relative; height: 12px; border-radius: 4px; margin-top: 2px; overflow: visible;
  background: var(--dsw-alias-bg-layer-1, #202020);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-border-l2); }
.nms-hist-zone { position: absolute; top: 0; bottom: 0; }
.nms-hist-zone[data-zone="health"] { border-radius: 4px 0 0 4px; background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent); }
.nms-hist-zone[data-zone="buffer"] { background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 14%, transparent); }
.nms-hist-zone[data-zone="async"] { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 26%, transparent); }
.nms-hist-zone[data-zone="force"] { border-radius: 0 4px 4px 0; background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent); }
.nms-hist-water-fill { position: absolute; top: 4px; bottom: 4px; left: 0; border-radius: 2px;
  background: var(--dsw-alias-label-secondary); transition: width .18s ease; }
.nms-hist-water-fill[data-over="true"] { background: var(--dsw-alias-label-primary); }
.nms-hist-water-pointer { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; border-radius: 1px;
  background: var(--dsw-alias-label-primary); }
/* Ticks are marks on the track only; their labels live on the axis above. */
.nms-hist-tick { position: absolute; top: -2px; width: 0; height: 16px;
  border-left: var(--dsh-hairline-width, .5px) dashed var(--dsw-alias-border-l2); }
.nms-hist-tick[data-tone="health"] { border-left-color: var(--dsw-alias-state-success-primary, #3fb950); }
.nms-hist-tick[data-tone="buffer"] { border-left-style: solid; border-left-color: var(--dsw-alias-state-warn-primary); }
.nms-hist-tick[data-tone="safety"] { border-left-color: var(--dsw-alias-state-error-primary, #f25a5a); }
/* Legend is a vertical stack: a horizontal row of labels can never line up
   with zones of different widths and reads as misaligned. Each row keeps
   name → range → hint on one baseline and lets the hint wrap on narrow
   widths so the dialog and the compact panel stay legible at any size. */
.nms-hist-legend { display: flex; flex-direction: column; gap: 3px; margin-top: 8px; }
.nms-hist-legend-item { display: flex; align-items: baseline; gap: 8px; min-width: 0; opacity: .72; }
.nms-hist-legend-item[data-current="true"] { opacity: 1; }
.nms-hist-legend-item[data-current="true"] .nms-hist-legend-name { color: var(--dsw-alias-label-primary); font-weight: 600; }
.nms-hist-legend-swatch { flex: none; width: 8px; height: 8px; align-self: center; border-radius: 2px; }
.nms-hist-legend-item[data-zone="health"] .nms-hist-legend-swatch { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 60%, transparent); }
.nms-hist-legend-item[data-zone="buffer"] .nms-hist-legend-swatch { background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 45%, transparent); }
.nms-hist-legend-item[data-zone="async"] .nms-hist-legend-swatch { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 70%, transparent); }
.nms-hist-legend-item[data-zone="force"] .nms-hist-legend-swatch { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 70%, transparent); }
.nms-hist-legend-copy { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 8px; min-width: 0; }
.nms-hist-legend-name { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-secondary); white-space: nowrap; font-variant-numeric: tabular-nums; }
.nms-hist-legend-range { font-size: 10px; line-height: 15px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.nms-hist-legend-hint { font-size: 10px; line-height: 15px; color: var(--dsw-alias-label-tertiary); min-width: 0; }
/* Tab switch + counters share one row. */
.nms-hist-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.nms-hist-stats { display: flex; align-items: center; gap: 12px; }
.nms-hist-stat { display: inline-flex; align-items: baseline; gap: 4px; }
.nms-hist-stat-value { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-primary); }
.nms-hist-stat[data-kind="commit"] .nms-hist-stat-value { color: var(--dsw-alias-state-success-primary, #3fb950); }
.nms-hist-stat[data-kind="drop"] .nms-hist-stat-value { color: var(--dsw-alias-state-error-primary, #f25a5a); }
.nms-hist-stat[data-kind="sync"] .nms-hist-stat-value { color: var(--dsw-alias-state-warn-primary); }
.nms-hist-stat-label { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.nms-hist-panel { min-height: 0; }
/* Episode cards: one per compaction; decisions unfold underneath. */
.nms-hist-eps { display: flex; flex-direction: column; gap: 6px; }
.nms-hist-ep { display: flex; flex-direction: column; border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-bg-layer-1, #202020);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-border-l2); }
.nms-hist-ep-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 10px 2px;
  border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer; }
.nms-hist-ep-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }
.nms-hist-ep-count { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.nms-hist-ep-summary { padding: 0 10px 7px 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.nms-hist-steps { display: flex; flex-direction: column; gap: 1px; padding: 0 6px 6px 16px;
  border-top: var(--dsh-hairline-width, .5px) solid var(--dsw-alias-border-l2); padding-top: 4px; }
.nms-hist-rows { display: flex; flex-direction: column; gap: 2px; }
.nms-hist-row-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 5px 6px;
  border: 0; border-radius: var(--dsw-radius-sm, 8px); background: transparent;
  color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer; }
.nms-hist-row-head:hover, .nms-hist-ep-head:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nms-hist-ep-head:hover { border-radius: var(--dsw-radius-sm, 8px) var(--dsw-radius-sm, 8px) 0 0; }
.nms-hist-row-headline { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.nms-hist-row-time { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.nms-hist-raw { margin: 2px 0 6px 6px; padding: 8px 10px; border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-bg-layer-2, #202020); color: var(--dsw-alias-label-secondary);
  font-family: var(--dsw-font-markdown-code-font-family);
  font-size: 11px; line-height: 16px; white-space: pre-wrap; word-break: break-word;
  overflow: auto; max-height: 240px; }
.nms-hist-diag { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }
/* Diagnostics: the facts grid stays put and only the raw snapshot scrolls.
   A panel-level scrollbar squeezed the whole pane left and misaligned the
   grid; moving the scrollbar inside .nms-hist-raw removes that offset. */
.nms-hist-panel[data-tab="diagnostics"] { overflow-y: hidden; display: flex; flex-direction: column; }
.nms-hist-diag .nms-hist-raw { margin: 0; max-height: none; flex: 1; min-height: 0; background: var(--dsw-alias-bg-layer-1, #202020); }
.nms-hist-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.nms-hist-fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 6px 8px; border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-bg-layer-1, #202020); box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-border-l2); }
.nms-hist-fact-label { font-size: 10px; line-height: 13px; color: var(--dsw-alias-label-tertiary); }
.nms-hist-fact-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 16px;
  color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }
.nms-hist-raw-title { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.nms-hist-empty { margin: 12px 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); text-align: center; }@keyframes nms-spin { to { transform: rotate(360deg); } }
@keyframes nms-pop { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .nms-panel { animation: none; } .nms-trigger-chevron { transition: none; } }
`
