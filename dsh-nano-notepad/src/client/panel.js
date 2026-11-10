/** Floating notepad panel. Persistence lives in db.js; this file draws and routes gestures. */

import {
  CHANNEL,
  clearContent,
  commitVersion,
  counts,
  createNode,
  deleteNode,
  deleteNodes,
  imageIdsIn,
  imagesById,
  loadSnapshot,
  moveNode,
  nextUntitled,
  updateNodeMeta,
  normalizeSettings,
  openDatabase,

  renameNode,
  pinNode,
  saveDraft,
  storeImage,
  versionsOf,
  writeSettings,
  writeUi,
} from './db.js'
import { applyFormat, escapeHtml, renderMarkdown } from './markdown.js'
import { validateJson, positionOf, formatJson, minifyJson, escapeJson, unescapeJson, decodeEscapes, renderJsonTree } from './json.js'
import { highlightSource } from './highlight.js'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { copyFor } from './i18n.js'
import React from 'react'
import { openNanoDialog, openNanoMenu, NANO_STYLES } from 'dsh-nano-ui'

const STYLE = `
${NANO_STYLES}
[data-nano-notepad] { pointer-events: none; }
/* ── notepad typography tokens ────────────────────────────────────────────────
   Declared on :root because nano-ui menus/dialogs portal to document.body —
   outside .np-layer — so only a document-level custom property reaches them.
   nano-ui reads the --nano-* vars (fallback = shell default); --np-* retunes
   the notepad's own text. Both stay on --dsw-* for theme colours. */
:root {
  --np-font-family: var(--dsw-font-family);
  --np-font-size: 13px;
  --np-font-size-sm: 12px;
  --np-font-size-xs: 11px;
  --np-font-size-xxs: 10px;
  --nano-font-family: var(--np-font-family);
  --nano-font-size: var(--np-font-size);
  --nano-line-height: 20px;
  --nano-title-size: 15px;
  --nano-desc-size: var(--np-font-size-sm);
  --nano-toast-size: var(--np-font-size-sm);
}
.np-layer { position: fixed; inset: 0; pointer-events: none; z-index: 30; color: var(--dsw-alias-label-primary); font-family: var(--np-font-family); font-size: var(--np-font-size); }
.np-entry, .np-window, .np-slash { pointer-events: auto; }
.np-entry, .np-window { position: absolute; }
.np-entry { z-index: 3; }
.np-window { z-index: 2; }
.np-window { --np-pad-x: 12px; --np-gap: 8px; --np-row-h: 40px; --np-node-h: 28px; --np-icon-btn: 28px; --np-icon-btn-sm: 22px; --np-indent: 16px; --np-rail: 52px; --np-menu-w: 220px; --np-foot-h: 52px; }
.np-slash[hidden], .np-window[hidden], .np-read[hidden], .np-write[hidden], .np-mirror[hidden], .np-error[hidden] { display: none !important; }
.np-window[data-theme="dark"], .np-entry[data-theme="dark"] { color-scheme: dark; --dsw-alias-bg-layer-1: #232324; --dsw-alias-bg-layer-2: #2c2c2e; --dsw-alias-bg-layer-3: #353638; --dsw-alias-bg-mask-1: #00000080; --dsw-alias-label-primary: #f9fafb; --dsw-alias-label-secondary: #cfd3d6; --dsw-alias-label-tertiary: #adb2b8; --dsw-alias-border-l2: #ffffff1f; --dsw-alias-border-l3: #ffffff29; --dsw-alias-interactive-bg-hover: #ffffff14; --dsw-alias-interactive-bg-active: #ffffff24; --dsw-alias-brand-primary: #f9fafb; --dsw-alias-brand-primary-invert: #0f1115; --dsw-alias-link: #7aaaff; --dsw-alias-state-error-primary: #f25a5a; --dsw-alias-state-error-secondary: #f25a5a; --dsw-alias-state-success-primary: #22c55e; --dsw-alias-state-success-secondary: #4ed17e; --dsw-alias-state-warn-primary: #f59e0b; --dsw-alias-state-warn-secondary: #f7ad31; --dsw-alias-interactive-bg-hover-danger: #f25a5a26; --dsw-alias-label-error: #f25a5a; --dsw-alias-tooltip-bg: #43454a; --dsw-alias-tooltip-label: #f9fafb; --dsw-alias-markdown-inline-code: #43454a; }
.np-window[data-theme="light"], .np-entry[data-theme="light"] { color-scheme: light; --dsw-alias-bg-layer-1: #ffffff; --dsw-alias-bg-layer-2: #ffffff; --dsw-alias-bg-layer-3: #ffffff; --dsw-alias-bg-mask-1: #0000003d; --dsw-alias-label-primary: #0f1115; --dsw-alias-label-secondary: #61666b; --dsw-alias-label-tertiary: #81858c; --dsw-alias-border-l2: #0000001a; --dsw-alias-border-l3: #0000001f; --dsw-alias-interactive-bg-hover: #2631480f; --dsw-alias-interactive-bg-active: #2631481a; --dsw-alias-brand-primary: #0f1115; --dsw-alias-brand-primary-invert: #f9fafb; --dsw-alias-link: #4176e6; --dsw-alias-state-error-primary: #ec1313; --dsw-alias-state-error-secondary: #f25a5a; --dsw-alias-state-success-primary: #22c55e; --dsw-alias-state-success-secondary: #4ed17e; --dsw-alias-state-warn-primary: #f59e0b; --dsw-alias-state-warn-secondary: #f7ad31; --dsw-alias-interactive-bg-hover-danger: #ec13130d; --dsw-alias-label-error: #ec1313; --dsw-alias-tooltip-bg: #43454a; --dsw-alias-tooltip-label: #f9fafb; --dsw-alias-markdown-inline-code: #f5f6f7; }
.np-entry { width: 36px; height: 36px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); cursor: grab; box-shadow: var(--dsw-elevation-soft); }
.np-entry:active { cursor: grabbing; }
.np-entry svg { width: 18px; height: 18px; display: block; margin: auto; }
.np-tip { position: absolute; right: 44px; top: 2px; white-space: nowrap; background: var(--dsw-alias-tooltip-bg); color: var(--dsw-alias-tooltip-label, var(--dsw-alias-label-primary)); border-radius: var(--dsw-radius-sm); padding: 4px 8px; }
.np-entry.np-tip-left .np-tip { right: auto; left: 44px; }
.np-unit { color: var(--dsw-alias-label-tertiary); font-style: normal; font-size: .85em; margin-inline-start: .5em; }
.np-window { width: min(920px, calc(100vw - 48px)); height: min(640px, calc(100vh - 48px)); min-width: 320px; min-height: 240px; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-panel, 28px); box-shadow: var(--dsw-elevation-prominent); overflow: hidden; container-type: inline-size; container-name: np; }
.np-resize { position: absolute; z-index: 6; pointer-events: auto; }
.np-resize[data-edge="n"], .np-resize[data-edge="s"] { left: 16px; right: 16px; height: 10px; cursor: ns-resize; }
.np-resize[data-edge="n"] { top: -5px; }
.np-resize[data-edge="s"] { bottom: -5px; }
.np-resize[data-edge="e"], .np-resize[data-edge="w"] { top: 16px; bottom: 16px; width: 10px; cursor: ew-resize; }
.np-resize[data-edge="e"] { right: -5px; }
.np-resize[data-edge="w"] { left: -5px; }
.np-resize[data-edge="nw"], .np-resize[data-edge="ne"], .np-resize[data-edge="sw"], .np-resize[data-edge="se"] { width: 16px; height: 16px; }
.np-resize[data-edge="nw"] { top: -5px; left: -5px; cursor: nwse-resize; }
.np-resize[data-edge="se"] { right: -5px; bottom: -5px; cursor: nwse-resize; }
.np-resize[data-edge="ne"] { top: -5px; right: -5px; cursor: nesw-resize; }
.np-resize[data-edge="sw"] { left: -5px; bottom: -5px; cursor: nesw-resize; }
.np-body, .np-editor { min-width: 0; overflow: hidden; }
.np-read, .np-write { overflow: auto; }
.np-nodes { overflow-x: hidden; overflow-y: auto; }
.np-tabs { display: flex; align-items: center; gap: 4px; min-height: var(--np-row-h); padding: 6px var(--np-pad-x); cursor: grab; border-bottom: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.np-toolbar, .np-tree-head { cursor: grab; }
/* Classic scrollbars (Windows / macOS "always") eat layout height and would
   shove the 28px tabs upward inside the 40px row. Hide the scrollbar like the
   toolbar does and let the right-edge fade signal more tabs. */
.np-tablist { display: flex; min-width: 0; gap: 2px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; mask-image: linear-gradient(to right, #000 88%, transparent); -webkit-mask-image: linear-gradient(to right, #000 88%, transparent); }
.np-tablist::-webkit-scrollbar { display: none; }
/* dockkit-style tab: 28px, sm radius, active fills markdown-tag, close fades in */
.np-tab { position: relative; display: inline-flex; align-items: center; flex: 0 1 auto; min-width: 90px; max-width: 196px; height: 28px; box-sizing: border-box; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); padding: 0 10px; cursor: default; font: inherit; font-size: var(--np-font-size); line-height: 1; white-space: nowrap; user-select: none; }
.np-tab:not([data-active="true"]):hover { background: var(--dsw-alias-interactive-bg-hover); }
.np-tab[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.np-tab-btn { min-width: 0; flex: 1; height: 100%; display: inline-flex; align-items: center; overflow: hidden; border: 0; background: transparent; color: inherit; font: inherit; padding: 0 16px 0 0; cursor: pointer; }
.np-tabs > button.np-close-tabs { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; box-sizing: border-box; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); cursor: pointer; }
.np-tabs > button.np-close-tabs svg { width: 16px; height: 16px; }
.np-tabs > button.np-close-tabs:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-tabs-spacer { flex: 1 1 auto; min-width: 8px; align-self: stretch; cursor: grab; }
/* window chrome: two skins share the frame, glyphs differ per os */
.np-chrome { display: inline-flex; align-items: center; gap: 8px; flex: none; }
.np-chrome button { display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; background: transparent; cursor: pointer; }
.np-window[data-chrome="mac"] .np-chrome { gap: 8px; margin-right: 8px; }
.np-window[data-chrome="mac"] .np-chrome button { width: 13px; height: 13px; border-radius: 50%; position: relative; }
.np-window[data-chrome="mac"] .np-chrome button.np-chrome-min { background: #ffbd4e; }
.np-window[data-chrome="mac"] .np-chrome button.np-chrome-max { background: #35c759; }
.np-window[data-chrome="mac"] .np-chrome button svg { width: 8px; height: 8px; color: #00000099; opacity: 0; transition: opacity .12s; }
.np-window[data-chrome="mac"] .np-tabs:hover .np-chrome button svg { opacity: 1; }
.np-window[data-chrome="windows"] .np-chrome { gap: 4px; }
.np-window[data-chrome="windows"] .np-chrome button { width: 28px; height: 24px; border-radius: var(--dsw-radius-sm); color: var(--dsw-alias-label-secondary); transition: background-color .12s ease, color .12s ease; }
.np-window[data-chrome="windows"] .np-chrome button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-window[data-chrome="windows"] .np-chrome button.np-chrome-max:hover { color: var(--dsw-alias-label-primary); }
.np-window[data-chrome="windows"] .np-chrome button.np-chrome-close:hover { background: var(--dsw-alias-state-error-primary, #e81123); color: #fff; }
.np-window[data-chrome="windows"] .np-chrome button svg { width: 11px; height: 11px; }
.np-window[data-chrome="windows"] .np-chrome button.np-chrome-close svg { width: 12px; height: 12px; }
.np-window[data-maximized="true"] .np-chrome button.np-chrome-max svg.np-icon-restore { display: block; }
.np-window[data-maximized="true"] .np-chrome button.np-chrome-max svg.np-icon-max { display: none; }
.np-window:not([data-maximized="true"]) .np-chrome button.np-chrome-max svg.np-icon-restore { display: none; }
.np-tab-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-tab-x { position: absolute; top: 4px; right: 4px; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: none; border: 0; background: transparent; border-radius: var(--dsw-radius-sm); color: var(--dsw-alias-label-tertiary); font: inherit; padding: 0; cursor: pointer; opacity: 0; pointer-events: none; }
.np-tab-x:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-tab:hover .np-tab-x, .np-tab:focus-within .np-tab-x, .np-tab[data-active="true"] .np-tab-x { opacity: 1; pointer-events: auto; }
/* Fade only across the close button. The button is 16px of padding; the ramp
   is that same strip, so letters stay solid until they enter the ×. */
.np-tab-name[data-clipped="true"] { text-overflow: clip; mask-image: linear-gradient(to right, #000 calc(100% - 16px), transparent); -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 16px), transparent); }
[data-changed-files] { position: relative; }
[data-changed-files]:has(> .np-to-notepad) { padding-right: 128px; }
.np-to-notepad, .np-change-action { position: absolute; z-index: 2; height: 28px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l2, #ffffff1f); border-radius: var(--dsw-radius-sm, 8px); background: var(--dsw-alias-bg-layer-1, #232324); color: var(--dsw-alias-label-primary, #f9fafb); font: inherit; font-size: var(--np-font-size-sm); line-height: 20px; cursor: pointer; }
.np-to-notepad { right: 12px; top: 50%; transform: translateY(-50%); }
.np-to-notepad:hover:not(:disabled), .np-change-action:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #ffffff14); }
.np-to-notepad:disabled, .np-change-action:disabled { opacity: .55; cursor: default; }
[data-changed-files] li { display: flex; align-items: center; gap: 8px; padding-right: 10px; }
[data-changed-files] li > .np-change-action { position: static; transform: none; flex: none; height: 22px; padding: 0 8px; }
[data-changed-files] li > :not(.np-change-action) { flex: 1; min-width: 0; }
.np-body { display: flex; min-height: 0; flex: 1; }
.np-tree { box-sizing: border-box; width: 248px; display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--dsw-alias-border-l2); background: transparent; }
.np-tree[data-collapsed="true"] { width: var(--np-rail); align-items: stretch; }
.np-tree[data-collapsed="true"] .np-ws, .np-tree[data-collapsed="true"] .np-tree-tools, .np-tree[data-collapsed="true"] .np-tree-head > span { display: none; }
.np-tree[data-collapsed="true"] .np-tree-head { display: none; }
/* collapsed rail still shows file icons for switching */
.np-tree[data-collapsed="true"] .np-nodes { display: flex; flex-direction: column; align-items: center; padding: 6px 0 var(--np-pad-x); }
.np-tree[data-collapsed="true"] .np-node { width: 40px; padding-left: 0 !important; padding-right: 0; justify-content: center; gap: 0; }
.np-tree[data-collapsed="true"] .np-node-main { flex: none; justify-content: center; padding-right: 0 !important; }
.np-tree[data-collapsed="true"] .np-node-name, .np-tree[data-collapsed="true"] .np-caret, .np-tree[data-collapsed="true"] .np-node-actions, .np-tree[data-collapsed="true"] .np-group { display: none; }
.np-tree[data-collapsed="true"] .np-node-icon svg { width: 18px; height: 18px; }
.np-tree-head { box-sizing: border-box; display: flex; flex: none; align-items: center; gap: 4px; width: 100%; height: 49px; padding: 6px var(--np-pad-x); color: var(--dsw-alias-label-tertiary); font-size: var(--np-font-size-sm); border-bottom: 1px solid var(--dsw-alias-border-l2); }
.np-tree-toggle { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); cursor: pointer; }
.np-tree-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-tree-toggle svg { width: 16px; height: 16px; display: block; fill: none; stroke: currentColor; stroke-width: 1; }
.np-tree-toggle svg .np-panel-fill { fill: currentColor; stroke: none; }
.np-tree-tools { display: flex; align-items: center; gap: 4px; flex: none; }
.np-tree-tools button { display: inline-flex; align-items: center; justify-content: center; width: var(--np-icon-btn); height: var(--np-icon-btn); padding: 0; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); cursor: pointer; }
.np-tree-tools button svg { width: 16px; height: 16px; display: block; }
.np-tree-tools button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.np-tree-tools button.np-danger:hover:not(:disabled) { color: var(--dsw-alias-state-error-secondary); border-color: var(--dsw-alias-state-error-secondary); background: var(--dsw-alias-interactive-bg-hover-danger); }
.np-tree-tools button:disabled { opacity: .4; cursor: default; }
.np-tree-tools button.np-danger:disabled { color: var(--dsw-alias-label-tertiary); }
.np-nodes { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 6px var(--np-pad-x) var(--np-pad-x); }
/* Editing-toolbar toggle: only ever shows at ≤560px where the toolbar row can
   collapse. Two placements — inside .np-tree-tools for the expanded tree, and
   as the tree's own last child so it survives when the head is hidden (collapsed). */
.np-tools-toggle { display: none; }
.np-tree > .np-tools-toggle { align-items: center; justify-content: center; width: var(--np-icon-btn); height: var(--np-icon-btn); flex: none; margin-left: auto; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); cursor: pointer; }
.np-tree > .np-tools-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-tools-toggle svg { width: 16px; height: 16px; display: block; }
.np-tree-foot { box-sizing: border-box; display: flex; align-items: center; gap: var(--np-gap); flex: none; min-height: var(--np-foot-h); padding: 0 var(--np-pad-x); border-top: 1px solid var(--dsw-alias-border-l2); }
.np-tree-foot button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; }
.np-tree-foot svg { width: 16px; height: 16px; display: block; }
.np-tree[data-collapsed="true"] .np-tree-foot { flex-direction: column; margin-top: auto; min-height: 0; padding: 8px 0 var(--np-pad-x); border-top: 0; }
.np-tree[data-collapsed="true"] .np-tree-foot span { display: none; }
.np-tree[data-collapsed="true"] .np-tree-foot button { width: var(--np-icon-btn); height: var(--np-icon-btn); padding: 0 !important; }
.np-node { position: relative; box-sizing: border-box; display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; height: var(--np-node-h); margin: 1px 0; padding-right: 8px; border-radius: var(--dsw-radius-sm); color: var(--dsw-alias-label-secondary); overflow: hidden; }
.np-node:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-node[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.np-node[data-drop="true"] { box-shadow: inset 0 0 0 1.5px var(--dsw-alias-link); }
.np-node-main { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; border: 0; background: transparent; color: inherit; padding: 0; text-align: left; font: inherit; cursor: pointer; overflow: hidden; }
.np-node-main:focus, .np-node-actions button:focus, .np-tab:focus, .np-caret:focus { outline: none; }
.np-window :focus-visible, .np-entry:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-link)); outline-offset: -2px; }
.np-node[data-pinned="true"] .np-node-main { padding-right: 26px; }
.np-node:hover .np-node-main, .np-node:focus-within .np-node-main { padding-right: 72px; }
@media (hover: none) { .np-node .np-node-main { padding-right: 72px; } .np-node .np-node-actions button { display: inline-flex; } }
.np-node-actions { position: absolute; right: 4px; top: 0; height: 100%; display: flex; align-items: center; gap: 0; }
.np-node-actions button { display: none; align-items: center; justify-content: center; width: 22px; height: 100%; box-sizing: border-box; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.np-node:hover .np-node-actions button, .np-node:focus-within .np-node-actions button { display: inline-flex; }
.np-node-actions button[data-pin][data-active="true"] { display: inline-flex; color: var(--dsw-alias-link); }
.np-node-actions button:hover { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.np-node-actions button.np-danger:hover { color: var(--dsw-alias-state-error-secondary); background: var(--dsw-alias-interactive-bg-hover-danger); }
.np-node-actions button[data-pin][data-active="true"]:hover { color: var(--dsw-alias-link); }
.np-transfer-list { display: flex; flex-direction: column; gap: 2px; margin: 2px 0 4px; }
.np-transfer-row { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 34px; padding: 6px 10px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer; }
.np-transfer-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.np-transfer-row[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); }
.np-transfer-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-transfer-check { display: none; color: var(--dsw-alias-link); }
.np-transfer-check svg { width: 16px; height: 16px; display: block; fill: currentColor; }
.np-transfer-row[data-active="true"] .np-transfer-check { display: inline-flex; }
.np-transfer-empty { margin: 8px 0; color: var(--dsw-alias-label-secondary); font-size: var(--np-font-size-sm); }
.np-caret { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--dsw-alias-label-tertiary); padding: 0; cursor: pointer; }
.np-caret[data-open="true"] svg { transform: rotate(90deg); }
.np-node-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; color: var(--dsw-alias-label-tertiary); }
.np-node-name { display: block; min-width: 0; overflow: hidden; white-space: nowrap; }
.np-node-name[data-fade="true"] { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 18px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 18px), transparent); }
.np-entry svg, .np-node-icon svg, .np-tree-tools svg, .np-tree-toggle svg, .np-tree-foot svg, .np-caret svg, .np-node-actions svg, .np-tool svg, .np-slash svg, .np-ws-caret svg { fill: currentColor; stroke: none; }
.np-tree-toggle svg { fill: none; stroke: currentColor; stroke-width: 1; }
.np-tree-toggle svg .np-panel-fill { fill: currentColor; stroke: none; }
.np-node-icon svg, .np-tree-tools svg, .np-tree-toggle svg, .np-caret svg, .np-node-actions svg, .np-tool svg, .np-slash svg { width: 16px; height: 16px; display: block; }
.np-ws { position: relative; flex: 1 1 auto; min-width: 0; }
.np-ws-btn { display: flex; align-items: center; gap: 6px; width: 100%; height: var(--np-icon-btn); box-sizing: border-box; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); font: inherit; font-size: var(--np-font-size-sm); cursor: pointer; }
.np-ws-btn:hover { background: var(--dsw-alias-interactive-bg-active); }
.np-ws-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.np-ws-caret { display: inline-flex; width: 14px; height: 14px; flex: none; color: var(--dsw-alias-label-tertiary); }
.np-ws-caret svg { width: 14px; height: 14px; }
.np-group { display: flex; align-items: center; gap: 6px; margin: 12px 0 4px; padding-left: 8px; color: var(--dsw-alias-label-tertiary); font-size: var(--np-font-size-xs); font-weight: 600; letter-spacing: .04em; line-height: 20px; }
.np-nodes > .np-group:first-child { margin-top: 2px; }
.np-group[data-active="true"] { color: var(--dsw-alias-label-primary); }
.np-group-count { font-size: var(--np-font-size-xs); font-weight: 400; color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-interactive-bg-active); border-radius: 8px; padding: 0 6px; line-height: 16px; }
.np-editor { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
.np-toolbar, .np-footer { min-width: 0; }
.np-toolbar { display: flex; gap: var(--np-gap); align-items: center; padding: 6px var(--np-pad-x); }
/* native segmented control: hover-gray track + layer-1 thumb sliding by translate */
.np-switch { flex: none; margin-left: auto; display: inline-grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; position: relative; padding: 4px; border: 0; background: var(--dsw-alias-interactive-bg-hover); border-radius: var(--dsw-radius-md); cursor: pointer; font: inherit; min-width: 148px; }
.np-switch .np-switch-label { display: inline-flex; align-items: center; justify-content: center; min-width: 0; height: 28px; padding: 0 14px; font-size: var(--np-font-size); font-weight: 500; color: var(--dsw-alias-label-secondary); z-index: 0; }
.np-switch { --np-switch-n: 2; --np-switch-i: 0; }
.np-switch .np-switch-thumb { position: absolute; top: 4px; left: 4px; width: calc((100% - 8px - (var(--np-switch-n) - 1) * 2px) / var(--np-switch-n)); height: calc(100% - 8px); display: flex; align-items: center; justify-content: center; padding: 0 14px; box-sizing: border-box; background: var(--dsw-alias-bg-layer-1); border-radius: var(--dsw-radius-sm); box-shadow: var(--dsw-elevation-soft); font-size: var(--np-font-size); font-weight: 500; color: var(--dsw-alias-label-primary); white-space: nowrap; overflow: hidden; transition: transform .16s ease; z-index: 1; }
.np-switch[data-view="rendered"] .np-switch-thumb { transform: translateX(calc(100% + 2px)); }
.np-toolbar { flex-wrap: wrap; gap: 2px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.np-tool { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); cursor: pointer; }
.np-tool:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-tool svg { width: 18px; height: 18px; }
.np-tool-sep { width: 1px; height: 18px; margin: 6px 4px; background: var(--dsw-alias-border-l2); flex: none; }
.np-window button:not([class]):not(.np-tree-tools button):not(.np-node-actions button):not(.np-slash button):not(.np-versions button), .np-footer-actions button.np-danger, .np-dlg-body button:not(.np-switch):not(.np-transfer-row) { border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: var(--dsw-radius-sm); padding: 4px 10px; cursor: pointer; font: inherit; line-height: 20px; }
.np-window button:hover, .np-dlg-body button:not(.np-switch):hover { background: var(--dsw-alias-interactive-bg-hover); }
/* keep the row/tab as the only hover surface; inner buttons must not double-fill
   — scoped to .np-window so we beat the generic .np-window button:hover rule */
.np-window .np-node-main:hover, .np-window .np-node-actions button:hover, .np-window .np-tab-btn:hover { background: transparent; }
.np-node-main, .np-caret, .np-node { border: 0; background: transparent; box-shadow: none; }
.np-tabs > button, .np-tab { background: transparent; }
.np-danger { color: var(--dsw-alias-label-error); }
.np-footer-actions button.np-danger { color: var(--dsw-alias-label-error); }
.np-footer-actions button.np-danger:hover, .np-dlg-body button.np-danger:hover { border-color: var(--dsw-alias-state-error-secondary); color: var(--dsw-alias-state-error-secondary); background: var(--dsw-alias-interactive-bg-hover-danger); }
.np-write, .np-read { flex: 1; min-height: 0; margin: 0; }
.np-switch[hidden], .np-md-tools[hidden], .np-json-tools[hidden] { display: none !important; }
.np-write { box-sizing: border-box; width: 100%; max-width: 100%; resize: none; border: 0; outline: 0; background: transparent; color: transparent; caret-color: var(--dsw-alias-label-primary); padding: var(--np-pad-x); margin: 0; font-family: var(--dsw-font-markdown-code-font-family); font-size: var(--np-editor-font-size, 14px); line-height: calc(var(--np-editor-font-size, 14px) * 1.45); letter-spacing: 0; word-spacing: 0; tab-size: 4; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap; position: relative; font-kerning: none; font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; }
/* Transparent text over a colourised mirror: keep the caret crisp and let the
   selection paint show through so the mirror reads underneath it. */
.np-write::selection { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent); color: transparent; }
.np-write:disabled { color: transparent; }
.np-mirror { position: absolute; z-index: 0; top: 0; left: 0; width: 0; height: 0; margin: 0; padding: var(--np-pad-x); box-sizing: border-box; overflow: hidden; font-family: var(--dsw-font-markdown-code-font-family); font-size: var(--np-editor-font-size, 14px); line-height: calc(var(--np-editor-font-size, 14px) * 1.45); letter-spacing: 0; word-spacing: 0; tab-size: 4; overflow-wrap: anywhere; word-break: break-word; color: var(--dsw-alias-label-primary); pointer-events: none; white-space: pre-wrap; font-kerning: none; font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; }
/* Spans may only change colour. Anything that changes the advance width
   moves the coloured glyphs off the textarea caret and the selection. */
.np-mirror span { font: inherit; letter-spacing: inherit; word-spacing: inherit; line-height: inherit; font-synthesis: none; padding: 0; margin: 0; border: 0; }
.nm-mk { color: var(--dsw-alias-label-tertiary); }
.nm-h { color: var(--dsw-alias-link); }
.nm-quote { color: var(--dsw-alias-state-success-primary); }
.nm-strong { color: #fbbf24; }
.nm-em { color: var(--dsw-alias-label-primary); }
.nm-angle { color: var(--dsw-alias-state-error-primary); }
.nm-bracket { color: var(--dsw-alias-link); }
.nm-brace { color: var(--dsw-alias-state-success-primary); }
.nm-strike { text-decoration: line-through; color: var(--dsw-alias-label-tertiary); }
.nm-code { color: var(--dsw-alias-state-warn-primary); background: var(--dsw-alias-interactive-bg-hover); border-radius: 3px; }
.nm-link { color: var(--dsw-alias-link); text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--dsw-alias-link) 55%, transparent); }
.nm-str { color: var(--dsw-alias-state-success-primary); }
.nm-num { color: var(--dsw-alias-link); }
.nm-bool { color: var(--dsw-alias-state-warn-primary); }
.nm-null { color: var(--dsw-alias-label-tertiary); font-style: italic; }
.nm-key { color: var(--dsw-alias-label-secondary); }
.np-write:focus-visible { outline: none; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l3); }
.np-read:focus-visible { outline: none; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l3); }
.np-tool:disabled, .np-footer-actions button:disabled { opacity: .45; pointer-events: none; }
.np-read { box-sizing: border-box; max-width: 100%; overflow: auto; overflow-wrap: anywhere; padding: var(--np-pad-x); color: var(--dsw-alias-label-primary); cursor: text; font-size: var(--np-editor-font-size, 14px); line-height: 1.65; }
.np-read h1 { margin: 16px 0 8px; font-size: 1.45em; line-height: 28px; font-weight: 600; }
.np-read h2 { margin: 14px 0 6px; font-size: 1.22em; line-height: 24px; font-weight: 600; }
.np-read h3 { margin: 12px 0 6px; font-size: 1.08em; line-height: 22px; font-weight: 600; }
.np-read p { margin: 6px 0; }
.np-read blockquote { margin: 8px 0; padding: 2px 12px; border-left: 3px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-secondary); }
.np-read ul, .np-read ol { margin: 6px 0; padding-left: 22px; }
.np-read li { margin: 2px 0; }
.np-read li input[type="checkbox"] { margin: 0 6px 0 0; vertical-align: -1px; }
.np-read code { background: var(--dsw-alias-markdown-inline-code, var(--dsw-alias-bg-layer-3)); border-radius: var(--dsw-radius-sm); padding: 1px 5px; font-family: var(--dsw-font-markdown-code-font-family); font-size: .92em; }
.np-read a { color: var(--dsw-alias-link); }
.np-read table { border-collapse: collapse; margin: 10px 0; font-size: .92em; display: block; overflow-x: auto; }
.np-read th, .np-read td { border: 1px solid var(--dsw-alias-border-l2); padding: 4px 12px; text-align: left; vertical-align: top; }
.np-read th { background: var(--dsw-alias-interactive-bg-hover); font-weight: 600; }
.np-read tr:nth-child(even) td { background: var(--dsw-alias-interactive-bg-hover); }
.np-read .np-fence { margin: 10px 0; padding: 10px 12px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); overflow-x: auto; }
.np-read .np-fence code { background: transparent; padding: 0; font-size: .9em; }
.np-read hr { border: 0; border-top: 1px solid var(--dsw-alias-border-l2); margin: 14px 0; }
.np-read img { display: block; max-width: min(100%, 640px); margin: 8px 0; border-radius: var(--dsw-radius-md); }
.np-read .missing-image { border: 1px dashed var(--dsw-alias-border-l3); padding: 2px 4px; }
.np-read .np-placeholder { color: var(--dsw-alias-label-secondary); }
.np-slash { position: absolute; z-index: 4; background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-3)); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); box-shadow: var(--dsw-elevation-prominent); backdrop-filter: var(--dsw-menu-backdrop-filter); }
/* .np-dlg-body wraps every NanoDialog's injected children: stacked content with the
   old .np-card-scroll rhythm, so settings/history/rename bodies look unchanged.
   NOTE: must NOT be .np-body — that class is the main tree+editor layout row. */
.np-dlg-body { display: flex; flex-direction: column; margin: 0; }
.np-dlg-body > * + * { margin-top: 10px; }
.np-dlg-body p, .np-dlg-body pre { margin: 0; color: var(--dsw-alias-label-secondary); line-height: 22px; }
.np-dlg-body pre { max-height: 240px; overflow: auto; white-space: pre-wrap; font-family: var(--dsw-font-markdown-code-font-family); }
.np-dlg-body label { display: flex; flex-direction: column; align-items: stretch; gap: 6px; margin: 0; color: var(--dsw-alias-label-secondary); }
/* DSH-native settings row: title + description left, control right, hairline row */
/* uniform rows: same container height for every field, dividers sit centered
   in the equal gap between them */
.np-dlg-body .np-field { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; min-height: 56px; padding: 10px 0; margin: 0; }
.np-dlg-body .np-field + .np-field { border-top: 1px solid var(--dsw-alias-border-l2); }
.np-dlg-body .np-field-text { flex: 1 1 140px; min-width: 140px; display: flex; flex-direction: column; gap: 2px; }
.np-dlg-body .np-field-name { color: var(--dsw-alias-label-primary); line-height: 20px; }
.np-dlg-body .np-field-desc { font-size: var(--np-font-size-sm); color: var(--dsw-alias-label-tertiary); line-height: 18px; }
/* pill number input with embedded unit */
.np-dlg-body input[type="number"] { appearance: none; -webkit-appearance: none; }
.np-dlg-body input::-webkit-outer-spin-button, .np-dlg-body input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.np-num { flex: none; display: inline-flex; align-items: center; gap: 6px; background: var(--dsw-alias-interactive-bg-hover); border: 1px solid transparent; border-radius: var(--dsw-radius-full, 999px); padding: 3px 12px; color: var(--dsw-alias-label-primary); }
.np-num:focus-within { border-color: var(--dsw-focus-ring-color, var(--dsw-alias-link)); }
.np-num input { width: auto; min-width: 4.5em; field-sizing: content; border: 0; background: transparent; padding: 2px 0; font: inherit; color: inherit; text-align: right; }
.np-num input:focus { outline: none; }
.np-num .np-num-unit { color: var(--dsw-alias-label-tertiary); font-size: var(--np-font-size-sm); white-space: nowrap; }
/* segmented control matching the app's color-scheme switch */
/* settings switches carry their index in --np-switch-i: thumb steps by
   (segment width + 2px gap), generic for N segments */
.np-switch[data-seg-field] .np-switch-thumb { transform: translateX(calc(var(--np-switch-i) * (100% + 2px))); }
.np-dlg-body input, .np-dlg-body select { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); padding: 8px 10px; font: inherit; }
.np-dlg-body input[type="number"] { max-width: 200px; }
.np-dlg-body input:focus, .np-dlg-body select:focus { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-link)); }
.np-versions { max-height: 240px; overflow: auto; display: flex; flex-direction: column; }
.np-versions button { display: block; width: 100%; border: 0; background: transparent; color: var(--dsw-alias-label-primary); border-radius: var(--dsw-radius-sm); padding: 6px 8px; text-align: left; font: inherit; cursor: pointer; }
.np-versions button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.np-error { display: flex; align-items: flex-start; gap: 8px; color: var(--dsw-alias-label-error); padding: 0 var(--np-pad-x) 8px; }
.np-error-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.np-error button { display: inline-flex; align-items: center; justify-content: center; width: var(--np-icon-btn-sm); height: var(--np-icon-btn-sm); flex: none; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-tertiary); border-radius: var(--dsw-radius-xs, 4px); cursor: pointer; }
.np-error button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-error button svg { width: 14px; height: 14px; fill: currentColor; }
.np-error button[data-action="load-remote"], .np-error button[data-action="keep-mine"] { width: auto; height: auto; flex: none; padding: 4px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); color: var(--dsw-alias-label-primary); font: inherit; line-height: 20px; }
.np-slash { width: var(--np-menu-w); max-height: 260px; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 1px; }
.np-slash .np-slash-empty { padding: 8px; color: var(--dsw-alias-label-tertiary); font-size: var(--np-font-size-sm); }
.np-footer { position: relative; z-index: 1; box-sizing: border-box; display: flex; align-items: center; gap: var(--np-gap); min-height: var(--np-foot-h); padding: 0 var(--np-pad-x); border-top: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
/* Panel-width responsiveness: container queries react to the floating window, not the viewport. */
@container np (max-width: 720px) {
  .np-tree { width: 200px; }
}
@container np (max-width: 640px) {
  .np-footer { flex-wrap: wrap; }
  .np-sync { flex-basis: 100%; }
  .np-footer-actions { flex-wrap: nowrap; }
  /* Keep the danger button grouped apart so a wrap never dumps it alone on
     a second row mid-row; it stays pinned to the row's end. */
  .np-footer-actions .np-danger { margin-left: auto; }
}
@container np (max-width: 560px) {
  .np-body { flex-direction: column; }
  .np-tree { width: auto; max-height: 40%; border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
  /* Cap the file list at 2.5 rows and fade the half-visible third row, so a
     long list never eats the editor; overflow stays reachable via scrolling. */
  .np-nodes { max-height: calc(var(--np-node-h) * 2.5 + 10px); mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent); -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent); }
  /* In a column body a collapsed tree stops being a rail and becomes a slim
     horizontal strip of icons pinned to the top. Otherwise the 52px column
     leaves an empty block under it and pushes the whole editor down. */
  .np-tab { min-width: 64px; }
  .np-tree[data-collapsed="true"] { width: auto; max-height: none; flex-direction: row; align-items: center; padding: 6px var(--np-pad-x); gap: 4px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
  .np-tree[data-collapsed="true"] .np-nodes { flex-direction: row; align-items: center; padding: 0; overflow-x: auto; overflow-y: hidden; flex: 1; gap: 2px; }
  .np-tree[data-collapsed="true"] .np-node { width: 36px; height: 36px; border-radius: var(--dsw-radius-sm); }
  .np-tree[data-collapsed="true"] .np-node:hover { background: var(--dsw-alias-interactive-bg-hover); }
  .np-tree[data-collapsed="true"] .np-node[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); }
  .np-tree[data-collapsed="true"] .np-node-icon svg { width: 20px; height: 20px; }
  .np-tree[data-collapsed="true"] .np-tree-foot { flex-direction: row; margin-top: 0; margin-left: auto; padding: 0; gap: 6px; flex: none; }
  .np-tree[data-collapsed="true"] .np-tree-foot button { width: var(--np-icon-btn); height: var(--np-icon-btn); padding: 0 !important; border-radius: var(--dsw-radius-sm); }
  .np-tree[data-collapsed="true"] .np-tree-foot button:hover { background: var(--dsw-alias-interactive-bg-hover); }
  .np-toolbar { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; mask-image: linear-gradient(to right, #000 88%, transparent); -webkit-mask-image: linear-gradient(to right, #000 88%, transparent); }
  .np-toolbar::-webkit-scrollbar { display: none; }
  .np-switch { min-width: 62px; grid-auto-columns: auto; }
  .np-switch .np-switch-label { display: none; }
  .np-switch .np-switch-thumb { position: static; transform: none; width: auto; height: 22px; padding: 0 8px; box-shadow: none; font-size: var(--np-font-size-sm); }
  .np-switch[data-view="rendered"] .np-switch-thumb { transform: none; }
  /* Four footer actions become icon-only squares like the tree's settings /
     close buttons; their titles carry the labels for hover + a11y. */
  .np-footer-actions button { width: var(--np-icon-btn); height: var(--np-icon-btn); padding: 0 !important; gap: 0; justify-content: center; }
  .np-footer-actions button > span { display: none; }
  .np-footer-actions svg { width: 15px; height: 15px; }
  /* Swap the tree's 52px settings/close row for footer icons — saves a whole row. */
  .np-tree-foot { display: none; }
  /* The plain unlayered np-foot-tools display:none ships later in the bundle
     and would win on equal specificity — force the swap. */
  .np-foot-tools { display: inline-flex !important; }
  .np-foot-tools button { width: var(--np-icon-btn); height: var(--np-icon-btn); }
  .np-foot-sep { display: block !important; }
  /* Editing controls hide by default at this width; the toggle re-shows them. */
  .np-window[data-tools="closed"] .np-toolbar { display: none; }
  .np-tree-tools .np-tools-toggle { display: inline-flex; }
  .np-tree[data-collapsed="true"] > .np-tools-toggle { display: inline-flex; }
}
/* Viewport-level mobile layout still applies when the whole page is small. */
@media (max-width: 760px) {
  .np-window { inset: 12px auto auto 12px; width: calc(100% - 24px); height: min(82dvh, calc(100% - 24px)); }
  .np-body { flex-direction: column; }
  .np-tree { width: auto; max-height: 34%; border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
  .np-tree[data-collapsed="true"] { width: auto; max-height: none; flex-direction: row; align-items: center; padding: 6px var(--np-pad-x); gap: 4px; }
  .np-tree[data-collapsed="true"] .np-nodes { flex-direction: row; align-items: center; padding: 0; overflow-x: auto; overflow-y: hidden; flex: 1; gap: 2px; }
  .np-tree[data-collapsed="true"] .np-node { width: 36px; height: 36px; border-radius: var(--dsw-radius-sm); }
  .np-tree[data-collapsed="true"] .np-node:hover { background: var(--dsw-alias-interactive-bg-hover); }
  .np-tree[data-collapsed="true"] .np-node[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); }
  .np-tree[data-collapsed="true"] .np-node-icon svg { width: 20px; height: 20px; }
  .np-tree[data-collapsed="true"] .np-tree-foot { flex-direction: row; margin-top: 0; margin-left: auto; padding: 0; gap: 6px; flex: none; }
  .np-tree[data-collapsed="true"] .np-tree-foot button { width: var(--np-icon-btn); height: var(--np-icon-btn); padding: 0 !important; border-radius: var(--dsw-radius-sm); }
  .np-tree[data-collapsed="true"] .np-tree-foot button:hover { background: var(--dsw-alias-interactive-bg-hover); }
  .np-footer { flex-direction: column; align-items: stretch; gap: 4px; }
  .np-footer-actions { justify-content: center; }
  .np-footer-actions button { min-height: 36px; }
  .np-tabs { flex-wrap: wrap; }
}
.np-sync { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; overflow: hidden; color: var(--dsw-alias-label-secondary); font-size: var(--np-font-size-sm); }
.np-status-text { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-beat { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--dsw-alias-label-tertiary); }
.np-beat[data-state="saved"], .np-beat[data-state="committed"] { background: var(--dsw-alias-state-success-primary); }
.np-beat[data-state="dirty"] { background: var(--dsw-alias-state-warn-primary); }
.np-beat[data-state="saving"] { background: var(--dsw-alias-link); animation: np-pulse 1s ease-in-out infinite; }
.np-beat[data-state="error"] { background: var(--dsw-alias-state-error-primary); }
.np-beat { transition: background-color .2s ease; }
@keyframes np-pulse { 50% { opacity: .25; } }
.np-footer-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
/* Settings/close live in the tree's foot row; in the narrow layout that row is
   hidden and these footer clones take over — so only show them there. */
.np-foot-tools { display: none; align-items: center; gap: 4px; }
.np-foot-sep { display: none; width: 1px; height: 20px; background: var(--dsw-alias-label-tertiary); align-self: center; flex: none; }
.np-footer-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; }
.np-footer-actions svg { width: 14px; height: 14px; flex: none; fill: currentColor; }
.np-section { border-top: 1px solid var(--dsw-alias-border-l2); padding-top: 2px; }
.np-dlg-body > .np-section:first-child { border-top: 0; padding-top: 0; }
.np-section h4 { margin: 0 0 8px; font-size: var(--np-font-size-sm); font-weight: 600; color: var(--dsw-alias-label-tertiary); }
/* informational row: same row height/rhythm, label left, value right */
.np-stat { display: inline-flex; align-items: baseline; gap: 6px; flex: none; color: var(--dsw-alias-label-secondary); font-size: inherit; white-space: nowrap; }
.np-usage-val { display: inline-flex; align-items: center; gap: 6px; flex: none; flex-wrap: wrap; justify-content: flex-end; margin-left: auto; }
.np-usage-chip { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 8px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); font-size: var(--np-font-size-sm); font-weight: 500; white-space: nowrap; }
.np-usage-chip svg { width: 13px; height: 13px; flex: none; fill: currentColor; }
.np-usage-chip b { font-weight: 600; color: var(--dsw-alias-label-primary); }
/* --- motion: quiet utility language — opacity/transform only, ≤200ms --- */
.np-tab, .np-tab-x, .np-tab-minimize, .np-tool, .np-caret, .np-node-main, .np-node-actions button, .np-tree-tools button, .np-tree-toggle, .np-ws-btn, .np-node, .np-versions button, .np-slash button, .np-entry { transition: background-color .12s ease, color .12s ease, border-color .12s ease, box-shadow .12s ease; }
.np-caret svg, .np-ws-caret svg { transition: transform .15s ease; }
.np-tree { transition: width .18s ease; }
.np-entry { transition: background-color .12s ease, color .12s ease, border-color .12s ease, transform .1s ease; }
.np-entry:hover { transform: scale(1.04); }
.np-entry:active { transform: scale(.97); }
@keyframes np-rise { from { opacity: 0; transform: translateY(6px); } }
.np-window:not([hidden]) { animation: np-rise .16s cubic-bezier(.2, .8, .3, 1); }
@keyframes np-fade { from { opacity: 0; } }
@keyframes np-pop { from { opacity: 0; transform: scale(.97) translateY(4px); } }
.np-slash.np-pop-in { animation: np-pop .12s cubic-bezier(.2, .8, .3, 1); }
@media (prefers-reduced-motion: reduce) {
  .np-window:not([hidden]), .np-slash.np-pop-in { animation: np-fade .12s ease; }
  .np-caret svg, .np-ws-caret svg, .np-tree, .np-entry { transition: background-color .12s ease, color .12s ease, border-color .12s ease; }
  .np-entry:hover, .np-entry:active { transform: none; }
}
/* JSON support: tool cluster, lint badge, collapsible tree. */
.np-json-tools { display: inline-flex; align-items: center; gap: 2px; }
.np-json-tools[hidden] { display: none; }
.np-md-tools { display: inline-flex; align-items: center; gap: 2px; }
.np-md-tools[hidden] { display: none; }
.np-lint { border: 0; background: transparent; font: inherit; font-size: var(--np-font-size-xs); padding: 0 6px; border-radius: 6px; cursor: pointer; white-space: nowrap; flex: none; }
.np-lint[data-state="ok"] { color: var(--dsw-alias-state-success-primary); }
.np-lint[data-state="err"] { color: var(--dsw-alias-state-error-primary); }
.np-lint[data-state="err"]:hover { background: var(--dsw-alias-interactive-bg-hover-danger); }
.nj-tree { font-family: var(--dsw-font-markdown-code-font-family); font-size: var(--np-editor-font-size, 14px); line-height: 1.7; }
.nj-node { display: flex; align-items: baseline; gap: 2px; cursor: pointer; list-style: none; padding: 1px 4px; border-radius: 4px; user-select: none; }
.nj-node:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nj-node::-webkit-details-marker { display: none; }
.nj-caret { display: inline-block; width: 12px; flex: none; transition: transform .12s ease; }
.nj-caret::before { content: '▸'; color: var(--dsw-alias-label-tertiary); font-size: var(--np-font-size-xxs); }
details[open] > .nj-node > .nj-caret { transform: rotate(90deg); }
.nj-preview { color: var(--dsw-alias-label-tertiary); font-size: .85em; margin-left: 6px; }
details[open] > .nj-node > .nj-preview { display: none; }
.nj-children { margin-left: 16px; border-left: 1px solid var(--dsw-alias-border-l2); padding-left: 8px; }
.nj-leaf { padding: 1px 4px; }
.nj-key { color: var(--dsw-alias-label-secondary); }
.nj-p { color: var(--dsw-alias-label-tertiary); }
.nj-str { color: var(--dsw-alias-state-success-primary); }
.nj-num { color: var(--dsw-alias-link); }
.nj-bool { color: var(--dsw-alias-state-warn-primary); }
.nj-null { color: var(--dsw-alias-label-tertiary); font-style: italic; }
.nj-type { color: var(--dsw-alias-label-tertiary); }
.nj-count { color: var(--dsw-alias-label-tertiary); font-size: .8em; }
`

const googleIcon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`
const textIcon = (label) => `<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="16.5" text-anchor="middle" font-size="10" font-weight="700" font-family="inherit">${label}</text></svg>`
/* dsh-native product glyph: renders a <use> against the document icon sprite
   maintained by ui-theme (symbol id dsw-icon-<glyph>-<weight>). Falls back
   silently when the shell predates the sprite. */
const dshIcon = (glyph, weight = 'regular', size = 16) => `<svg width="${size}" height="${size}" data-icon="dsw-icon-${glyph}-${weight}" aria-hidden="true"><use href="#dsw-icon-${glyph}-${weight}"/></svg>`
const FILE_ICON = dshIcon('browse-outline')
const FOLDER_ICON = dshIcon('folder-close')
const PLUS_ICON = dshIcon('plus-outline')
const CLOSE_ICON = dshIcon('close-outline')
const SETTINGS_ICON = dshIcon('settings-outline')
const PIN_ON_ICON = dshIcon('pin-fill')
const PIN_OFF_ICON = dshIcon('pin-outline')
const MOVE_ICON = dshIcon('deliver-doc')
const MORE_ICON = dshIcon('ellipsis-outline')
/* Expand/collapse-all in the JSON tools: single chevrons read as "open /
   fold everything"; the dedicated all-all glyph does not exist in the set. */
const EXPAND_ICON = dshIcon('chevron-down-outline')
const COLLAPSE_ICON = dshIcon('chevron-up-outline')
const FORMAT_ICON = dshIcon('wrap-lines-outline')
const MINIFY_ICON = dshIcon('compact-outline')
const ESCAPE_ICON = googleIcon('M8 5 4 12h4v7l4-9H8z')
const UNESCAPE_ICON = googleIcon('M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z')
const STRIP_ICON = googleIcon('M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z')
const CHEVRON_ICON = dshIcon('chevron-down-outline')
const CARET_ICON = dshIcon('triangle-right-fill')
const CHECK_ICON = dshIcon('check-outline')
/* DSH sidebar glyph (panel-left-outline, 16px). Open fills the left pane; closed is the outline. */
const PANEL_ICON = (filled) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 1.5H2.5C1.94772 1.5 1.5 1.94772 1.5 2.5V13.5C1.5 14.0523 1.94772 14.5 2.5 14.5H13.5C14.0523 14.5 14.5 14.0523 14.5 13.5V2.5C14.5 1.94772 14.0523 1.5 13.5 1.5Z"></path><path d="M5.5 1.5V14.5"></path>${filled ? '<path class="np-panel-fill" d="M2.5 1.5H5.5V14.5H2.5C1.94772 14.5 1.5 14.0523 1.5 13.5V2.5C1.5 1.94772 1.94772 1.5 2.5 1.5Z"></path>' : ''}</svg>`
const WIN_MIN_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>'
const ICON = FILE_ICON

/** Format toolbar + slash menu share one definition list. */
const FORMAT_DEFS = [
  { kind: 'paragraph', icon: googleIcon('M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z') },
  { kind: 'h1', icon: textIcon('H1') },
  { kind: 'h2', icon: textIcon('H2') },
  { kind: 'h3', icon: textIcon('H3') },
  { kind: 'bold', icon: googleIcon('M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42M10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3m3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5') },
  { kind: 'italic', icon: googleIcon('M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z') },
  { kind: 'strike', icon: googleIcon('M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z') },
  { kind: 'bullet', icon: dshIcon('flat-list-outline') },
  { kind: 'numbered', icon: googleIcon('M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1z') },
  { kind: 'task', icon: dshIcon('checklist-outline') },
  { kind: 'quote', icon: googleIcon('M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z') },
  { kind: 'link', icon: dshIcon('link-outline') },
  { kind: 'image', icon: dshIcon('apps-add-outline') },
]

/** @param {ParentNode} root @param {string} selector */
function must(root, selector) {
  const node = root.querySelector(selector)
  if (!(node instanceof HTMLElement)) throw new Error(`notepad missing ${selector}`)
  return node
}

/** Measure caret coordinates inside a textarea via a mirror element. */
function caretRect(area, position) {
  const style = getComputedStyle(area)
  const div = document.createElement('div')
  for (const prop of ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'tabSize']) {
    div.style[prop] = style[prop]
  }
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.top = '0'
  div.style.left = '0'
  div.style.whiteSpace = 'pre-wrap'
  div.style.overflowWrap = 'anywhere'
  div.textContent = area.value.slice(0, position)
  const marker = document.createElement('span')
  marker.textContent = '​'
  div.append(marker)
  area.parentElement?.append(div)
  const rect = { top: marker.offsetTop, left: marker.offsetLeft, height: marker.offsetHeight || 18 }
  div.remove()
  return rect
}

export function mountNotepad(host, defaults, appTheme = { scheme: () => 'dark', subscribe: () => () => {} }, language = { current: () => 'en', subscribe: () => () => {} }, workspaces = { current: () => ({ items: [], currentId: null }), subscribe: () => () => {} }, previewFile = () => false) {
  host.innerHTML = `<div class="np-layer"><button class="np-entry" type="button">${ICON}<span class="np-tip" hidden></span></button><section class="np-window" hidden></section></div>`
  const layer = must(host, '.np-layer')
  const entry = must(host, '.np-entry')
  const tip = must(host, '.np-tip')
  const panel = must(host, '.np-window')
  const toolbar = FORMAT_DEFS.map(def => def.kind === 'image'
    ? `<button type="button" class="np-tool" data-action="image" data-format-kind="image">${def.icon}</button>`
    : `<button type="button" class="np-tool" data-format="${def.kind}" data-format-kind="${def.kind}">${def.icon}</button>`).join('')
  panel.innerHTML = `
    <div class="np-tabs"><button type="button" class="np-tree-toggle" data-action="toggle-tree"></button><button type="button" class="np-close-tabs" data-action="close-tabs" data-i18n="saveCloseTabs" data-i18n-mode="title">${dshIcon('archive-check-outline')}</button><div class="np-tablist"></div><span class="np-tabs-spacer"></span></div>
    <div class="np-body">
      <aside class="np-tree"><div class="np-tree-head"><div class="np-ws"><button type="button" class="np-ws-btn" data-action="ws-toggle" aria-haspopup="listbox" aria-expanded="false"><span class="np-ws-label"></span><span class="np-ws-caret" aria-hidden="true">${CHEVRON_ICON}</span></button></div><span class="np-tree-tools"><button type="button" data-action="new-item" data-i18n="newItem" data-i18n-mode="title" aria-haspopup="menu">${PLUS_ICON}</button><button type="button" class="np-danger" data-action="delete" data-i18n="clearUnpinned" data-i18n-mode="title">${dshIcon('trash-outline')}</button><button type="button" class="np-tools-toggle" data-action="toggle-tools" data-i18n="expandTools" data-i18n-mode="title" aria-expanded="false">${CHEVRON_ICON}</button></span></div><div class="np-nodes" data-root="true"></div><button type="button" class="np-tools-toggle" data-action="toggle-tools" data-i18n="expandTools" data-i18n-mode="title" aria-expanded="false">${CHEVRON_ICON}</button><div class="np-tree-foot"><button type="button" data-action="settings" data-i18n="settings" data-i18n-mode="label">${SETTINGS_ICON}<span data-i18n="settings"></span></button><button type="button" data-action="close" data-i18n="close" data-i18n-mode="label">${CLOSE_ICON}<span data-i18n="close"></span></button></div></aside>
      <div class="np-editor">
        <div class="np-toolbar"><span class="np-md-tools">${toolbar}</span><span class="np-json-tools" hidden><button type="button" class="np-tool" data-json="expand" data-i18n="jsonExpand" data-i18n-mode="title">${EXPAND_ICON}</button><button type="button" class="np-tool" data-json="collapse" data-i18n="jsonCollapse" data-i18n-mode="title">${COLLAPSE_ICON}</button><span class="np-tool-sep"></span><button type="button" class="np-tool" data-json="format" data-i18n="jsonFormat" data-i18n-mode="title">${FORMAT_ICON}</button><button type="button" class="np-tool" data-json="minify" data-i18n="jsonMinify" data-i18n-mode="title">${MINIFY_ICON}</button><button type="button" class="np-tool" data-json="escape" data-i18n="jsonEscape" data-i18n-mode="title">${ESCAPE_ICON}</button><button type="button" class="np-tool" data-json="unescape" data-i18n="jsonUnescape" data-i18n-mode="title">${UNESCAPE_ICON}</button><button type="button" class="np-tool" data-json="strip" data-i18n="jsonStrip" data-i18n-mode="title">${STRIP_ICON}</button></span><button type="button" class="np-switch" data-action="view" role="switch" aria-checked="false" data-i18n="viewGroup" data-i18n-mode="title"><span class="np-switch-label" data-i18n="source"></span><span class="np-switch-label" data-i18n="preview"></span><span class="np-switch-thumb" data-i18n="source"></span></button></div>
        <div class="np-mirror" aria-hidden="true"></div>
        <textarea class="np-write" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
        <div class="np-slash" hidden></div>
        <div class="np-read" tabindex="0" hidden></div>
        <div class="np-error" role="alert" hidden><span class="np-error-text"></span><button type="button" data-action="load-remote" data-i18n="loadRemote" hidden></button><button type="button" data-action="keep-mine" data-i18n="keepMine" hidden></button><button type="button" data-action="dismiss-error" data-i18n="close" data-i18n-mode="title">${CLOSE_ICON}</button></div>
        <footer class="np-footer"><span class="np-sync"><i class="np-beat" data-state="idle"></i><button type="button" class="np-lint" role="status" hidden></button><span class="np-status-text" role="status" aria-live="polite"></span></span><span class="np-footer-actions"><button type="button" data-action="export-file" data-i18n="saveAs" data-i18n-mode="label">${dshIcon('download-outline')}<span data-i18n="saveAs"></span></button><button type="button" data-action="history" data-i18n="history" data-i18n-mode="label">${dshIcon('clock-outline')}<span data-i18n="history"></span></button><button type="button" data-action="save-version" data-i18n="saveVersion" data-i18n-mode="label">${dshIcon('save-outline')}<span data-i18n="saveVersion"></span></button><button type="button" class="np-danger" data-action="clear-file" data-i18n="clearFile" data-i18n-mode="label">${dshIcon('trash-outline')}<span data-i18n="clearFile"></span></button><span class="np-foot-sep" aria-hidden="true"></span><span class="np-foot-tools" aria-hidden="true"><button type="button" data-action="settings" data-i18n="settings" data-i18n-mode="label">${SETTINGS_ICON}<span data-i18n="settings"></span></button><button type="button" data-action="close" data-i18n="close" data-i18n-mode="label">${CLOSE_ICON}<span data-i18n="close"></span></button></span></span></footer>
      </div>
    </div>
    <div class="np-resize" data-edge="n"></div><div class="np-resize" data-edge="s"></div><div class="np-resize" data-edge="e"></div><div class="np-resize" data-edge="w"></div><div class="np-resize" data-edge="nw"></div><div class="np-resize" data-edge="ne"></div><div class="np-resize" data-edge="sw"></div><div class="np-resize" data-edge="se"></div>
    <input class="np-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
  `
  const style = document.createElement('style')
  style.textContent = STYLE
  host.append(style)

  const text = () => copyFor(language.current())

  function formatLabel(kind) {
    const copy = text()
    return kind === 'image' ? copy.image : (copy.formats[kind] ?? kind.toUpperCase())
  }

  function applyCopy() {
    const copy = text()
    for (const node of panel.querySelectorAll('[data-i18n]')) {
      const value = copy[node.dataset.i18n]
      if (typeof value !== 'string') continue
      if (node.dataset.i18nMode === 'title' || node.dataset.i18nMode === 'label') {
        node.title = value
        node.setAttribute('aria-label', value)
      }
      if (node.dataset.i18nMode !== 'title' && node.dataset.i18nMode !== 'label') node.textContent = value
    }
    const SHORTCUT_HINTS = { bold: '⌘B', italic: '⌘I', link: '⌘K', code: '⌘E', strike: '⌘⇧X' }
    for (const node of panel.querySelectorAll('[data-format-kind]')) {
      const label = formatLabel(node.dataset.formatKind)
      const hint = SHORTCUT_HINTS[node.dataset.formatKind]
      const titled = hint ? `${label} (${hint})` : label
      node.title = titled
      node.setAttribute('aria-label', titled)
      if (!node.querySelector('svg')) node.textContent = label
    }
    panel.querySelector('.np-switch')?.setAttribute('aria-label', copy.viewGroup)
    panel.querySelector('.np-read')?.setAttribute('aria-label', copy.editHint)
    panel.querySelector('.np-read')?.setAttribute('title', copy.editHint)
    write().placeholder = copy.placeholder
    paintStatus()
  }

  const state = {
    db: /** @type {IDBDatabase | null} */ (null),
    nodes: /** @type {any[]} */ ([]),
    settings: defaults,
    ui: { id: 'ui', open: false, tabs: /** @type {string[]} */ ([]), currentId: /** @type {string | null} */ (null), entryX: null, entryY: null, panelX: null, panelY: null },
    view: defaults.defaultView,
    slash: null,
    slashIndex: 0,
    saveTimer: /** @type {number | undefined} */ (undefined),
    commitTimer: /** @type {number | undefined} */ (undefined),
    dirty: false,
    lastDraftWrite: /** @type {Record<string, number>} */ ({}),
    pendingFileId: /** @type {string | null} */ (null),
    pendingDraft: /** @type {string | null} */ (null),
    sync: { phase: 'idle', at: null, detail: '' },
    collapsed: new Set(),
    /** fileId → Set<json-pointer path> for the JSON tree's folded nodes. */
    jsonCollapsed: new Map(),
    maximized: false,
    /** Bumped whenever an image is stored; part of the rendered-body cache key. */
    imageEpoch: 0,
    /** file.id + epoch + markdown → rendered HTML, so non-edit renders reuse it. */
    renderCache: new Map(),
    restoreRect: /** @type {{ left: number, top: number, width: number, height: number } | null} */ (null),
    /** `<fileId>:<view>` already re-scrolled this activation; null asks the next
       renderBody to apply the saved caret/scroll. */
    restoredKey: /** @type {string | null} */ (null),
    /** Editing-toolbar collapsed flag; only takes effect at ≤560px panel width. */
    toolsOpen: false,
  }

  const disposers = []
  /** @param {any} target @param {string} type @param {any} fn @param {any} [opts] */
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    disposers.push(() => target.removeEventListener(type, fn, opts))
  }

  const write = () => /** @type {HTMLTextAreaElement} */ (must(panel, '.np-write'))
  const mirror = () => /** @type {HTMLElement} */ (must(panel, '.np-mirror'))
  /** Repaint the colourised layer under the transparent textarea and realign
     scroll so every glyph stays under its source counterpart. */
  const paintMirror = () => {
    const source = write()
    const layer = mirror()
    layer.innerHTML = highlightSource(source.value, isJson())
    fitMirror()
    layer.hidden = source.hidden
  }
  /** Keep the colour layer the same rectangle as the textarea. A box that
      runs to the editor's bottom paints the last lines across the footer. */
  const fitMirror = () => {
    const source = write()
    const layer = mirror()
    layer.style.top = `${source.offsetTop}px`
    layer.style.left = `${source.offsetLeft}px`
    /* clientWidth excludes the scrollbar. offsetWidth is wider, so the mirror
       wraps later than the textarea and the selection lands on the wrong glyphs. */
    layer.style.width = `${source.clientWidth}px`
    layer.style.height = `${source.clientHeight}px`
    layer.scrollTop = source.scrollTop
    layer.scrollLeft = source.scrollLeft
  }
  const current = () => state.nodes.find(node => node.id === state.ui.currentId && node.kind === 'file')
  const isJson = () => (current()?.name ?? '').toLowerCase().endsWith('.json')
  const jsonCollapsedFor = id => {
    if (!state.jsonCollapsed.has(id)) state.jsonCollapsed.set(id, new Set())
    return state.jsonCollapsed.get(id)
  }

  function showError(error, conflict = false, bare = false) {
    const node = must(panel, '.np-error')
    node.hidden = false
    const full = error?.name === 'QuotaExceededError'
    const message = full ? text().quota : (error instanceof Error ? error.message : String(error))
    const shown = full || conflict || bare ? message : `${text().saveFailed}：${message}`
    node.querySelector('.np-error-text').textContent = shown
    node.querySelector('.np-error-text').title = message
    for (const action of ['load-remote', 'keep-mine']) {
      const btn = node.querySelector(`[data-action="${action}"]`)
      if (btn) btn.hidden = !conflict
    }
    setSync('error', message)
  }

  function setSync(phase, detail = '') {
    state.sync = { phase, at: Date.now(), detail }
    paintStatus()
  }

  function paintStatus() {
    const beat = panel.querySelector('.np-beat')
    const label = panel.querySelector('.np-status-text')
    if (!beat || !label) return
    beat.dataset.state = state.sync.phase
    const time = state.sync.at ? new Date(state.sync.at).toLocaleTimeString() : ''
    const status = text().status
    const value = status[state.sync.phase]
    label.textContent = typeof value === 'function' ? value(state.sync.detail || time) : (value ?? status.idle)
  }

  function workspaceCatalog() {
    const snapshot = workspaces.current()
    return {
      items: snapshot.items ?? [],
      currentId: snapshot.currentId ?? null,
    }
  }

  function activeWorkspace() {
    const choice = state.ui.workspaceChoice ?? 'all'
    if (choice === 'all') return { mode: 'all', id: null }
    if (choice === 'unassigned') return { mode: 'one', id: null }
    if (choice === 'current') return { mode: 'one', id: workspaceCatalog().currentId }
    return { mode: 'one', id: choice }
  }

  function workspaceTitle(id) {
    const copy = text()
    if (!id) return copy.unassigned
    return workspaceCatalog().items.find(item => item.workspaceId === id)?.title || copy.removedWorkspace
  }

  function pathOf(id) {
    const names = []
    let cursor = state.nodes.find(node => node.id === id)
    const guard = new Set()
    while (cursor && !guard.has(cursor.id)) {
      guard.add(cursor.id)
      names.unshift(cursor.name)
      cursor = state.nodes.find(node => node.id === cursor.parentId)
    }
    return `/${names.join('/')}`
  }

  async function exportFile() {
    const file = current()
    if (!file) return
    const content = write().value ?? file.draft ?? ''
    const blob = new Blob([content], { type: 'text/markdown' })
    const name = file.name.endsWith('.md') ? file.name : `${file.name}.md`
    const opts = {
      suggestedName: name,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.txt'] } }],
    }
    /* pick the host window first — inside a same-origin iframe the picker
       may be blocked there; parent same-origin call still works */
    let lastError = null
    for (const host of [window, window.top !== window ? window.top : null].filter(Boolean)) {
      if (typeof host.showSaveFilePicker !== 'function') continue
      try {
        const handle = await host.showSaveFilePicker(opts)
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        setSync('exported', name)
        return
      } catch (error) {
        lastError = error
        if (error?.name === 'AbortError') return
      }
    }
    /* browser picker refused (iframe/policy) — ask the host for a native macOS
       dialog via osascript; the dsh daemon shows choose-file-name itself */
    try {
      const res = await fetch('/nano-notepad/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, content, dir: current()?.sourcePath?.replace(/\/[^/]*$/, '') }),
      })
      const out = await res.json().catch(() => ({}))
      if (out.ok) { setSync('exported', out.path || name); return }
      if (out.reason === 'cancelled') return
      console.warn('[notepad] host save 失败：', out.message || out.reason)
    } catch (error) {
      console.warn('[notepad] host save 不可达：', String(error?.message || error).slice(0, 120))
    }
    /* last resort: browser download */
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setSync('exported', name)
    console.warn('[notepad] 仅浏览器下载可用')
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max))
  }

  function place(node, x, y, fallbackRight) {
    const width = node.offsetWidth || 36
    const height = node.offsetHeight || 36
    const limitWidth = window.innerWidth
    const limitHeight = window.innerHeight
    const left = x ?? Math.max(8, limitWidth - width - (fallbackRight ?? 24))
    const top = y ?? Math.max(8, limitHeight - height - 24)
    node.style.left = `${Math.min(Math.max(8, left), Math.max(8, limitWidth - width - 8))}px`
    node.style.top = `${Math.min(Math.max(8, top), Math.max(8, limitHeight - height - 8))}px`
  }

  function applyWindowSize() {
    if (state.maximized) {
      panel.style.left = '12px'
      panel.style.top = '12px'
      panel.style.width = `${window.innerWidth - 24}px`
      panel.style.height = `${window.innerHeight - 24}px`
      return
    }
    const maxWidth = Math.max(320, window.innerWidth - 16)
    const maxHeight = Math.max(240, window.innerHeight - 16)
    if (Number.isFinite(state.ui.panelW)) panel.style.width = `${clamp(state.ui.panelW, 320, maxWidth)}px`
    else panel.style.width = ''
    if (Number.isFinite(state.ui.panelH)) panel.style.height = `${clamp(state.ui.panelH, 240, maxHeight)}px`
    else panel.style.height = ''
  }

  function toggleMaximize() {
    flushSave()
    if (state.maximized) {
      state.maximized = false
      if (state.restoreRect) {
        panel.style.left = `${state.restoreRect.left}px`
        panel.style.top = `${state.restoreRect.top}px`
        panel.style.width = `${state.restoreRect.width}px`
        panel.style.height = `${state.restoreRect.height}px`
      }
    } else {
      state.restoreRect = { left: panel.offsetLeft, top: panel.offsetTop, width: panel.offsetWidth, height: panel.offsetHeight }
      state.maximized = true
    }
    render()
  }

  function renderChrome() {
    const tabs = must(panel, '.np-tabs')
    const copy = text()
    const chrome = state.settings.chromeStyle === 'windows' ? 'windows' : 'mac'
    panel.dataset.chrome = chrome
    panel.dataset.maximized = String(state.maximized)
    panel.dataset.tools = state.toolsOpen ? 'open' : 'closed'
    for (const toggle of panel.querySelectorAll('.np-tools-toggle')) {
      toggle.innerHTML = state.toolsOpen ? COLLAPSE_ICON : CHEVRON_ICON
      toggle.setAttribute('aria-expanded', String(state.toolsOpen))
      const label = state.toolsOpen ? copy.collapseTools : copy.expandTools
      toggle.title = label
      toggle.setAttribute('aria-label', label)
    }
    const prev = tabs.querySelector('.np-chrome')
    if (prev) prev.remove()
    const group = document.createElement('span')
    group.className = 'np-chrome'
    if (chrome === 'mac') {
      group.innerHTML = `<button type="button" class="np-chrome-min" data-action="close" title="${escapeHtml(copy.minimize)}" aria-label="${escapeHtml(copy.minimize)}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></button><button type="button" class="np-chrome-max" data-action="maximize" title="${escapeHtml(state.maximized ? copy.restoreWindow : copy.maximize)}" aria-label="${escapeHtml(state.maximized ? copy.restoreWindow : copy.maximize)}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2.5v7M2.5 6h7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></button>`
      tabs.prepend(group)
    } else {
      group.innerHTML = `<button type="button" class="np-chrome-min" data-action="close" title="${escapeHtml(copy.minimize)}" aria-label="${escapeHtml(copy.minimize)}">${WIN_MIN_ICON}</button><button type="button" class="np-chrome-max" data-action="maximize" title="${escapeHtml(state.maximized ? copy.restoreWindow : copy.maximize)}" aria-label="${escapeHtml(state.maximized ? copy.restoreWindow : copy.maximize)}"><svg class="np-icon-max" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2h8v8H2z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg><svg class="np-icon-restore" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3h6v6H3z M1 5V1h4" fill="none" stroke="currentColor" stroke-width="1.1"/></svg></button>`
      const spacer = tabs.querySelector('.np-tabs-spacer')
      tabs.insertBefore(group, spacer ? spacer.nextSibling : null)
    }
  }

  function renderTree() {
    const box = must(panel, '.np-nodes')
    const lines = []
    const active = activeWorkspace()
    // Group children once by (workspace, parent) so `visit` is O(1) per node
    // instead of re-filtering the whole list at every depth (was O(N²)).
    const byParent = new Map()
    for (const node of state.nodes) {
      const key = `${node.workspaceId ?? ''}${node.parentId ?? ''}`
      let bucket = byParent.get(key)
      if (bucket === undefined) { bucket = []; byParent.set(key, bucket) }
      bucket.push(node)
    }
    const visit = (parentId, depth, workspaceId) => {
      const nodes = byParent.get(`${workspaceId ?? ''}${parentId ?? ''}`) ?? []
      /* Folders sit above every file, pinned files included. Pin only reorders
         within the same kind. */
      nodes.sort((a, b) => Number(a.kind === 'file') - Number(b.kind === 'file') || Number(b.pinned === true) - Number(a.pinned === true) || a.name.localeCompare(b.name))
      for (const node of nodes) {
        const icon = node.kind === 'folder' ? FOLDER_ICON : FILE_ICON
        const name = escapeHtml(node.name)
        const expanded = !state.collapsed.has(node.id)
        const caret = node.kind === 'folder' ? `<button type="button" class="np-caret" data-caret="${node.id}" data-open="${expanded}" aria-expanded="${expanded}" aria-label="${escapeHtml(node.name)} · ${escapeHtml(expanded ? text().collapse : text().expand)}">${CARET_ICON}</button>` : ''
        const pinLabel = node.pinned === true ? text().unpin : text().pin
        const pin = `<button type="button" data-pin="${node.id}" data-active="${node.pinned === true}" title="${escapeHtml(pinLabel)}" aria-label="${escapeHtml(pinLabel)}">${node.pinned === true ? PIN_ON_ICON : PIN_OFF_ICON}</button>`
        lines.push(`<div class="np-node" data-kind="${node.kind}" data-pinned="${node.pinned === true}" data-active="${node.id === state.ui.currentId}" title="${name}" style="padding-left:${8 + depth * 16}px">${caret}<button class="np-node-main" type="button" draggable="true" data-id="${node.id}" aria-label="${name}"><span class="np-node-icon" aria-hidden="true">${icon}</span><span class="np-node-name">${name}</span></button><span class="np-node-actions">${pin}<button type="button" data-move="${node.id}" title="${escapeHtml(text().transfer)}" aria-label="${escapeHtml(text().transfer)}">${MOVE_ICON}</button><button type="button" data-more="${node.id}" title="${escapeHtml(text().more)}" aria-label="${escapeHtml(text().more)}" aria-haspopup="menu">${MORE_ICON}</button></span></div>`)
        if (node.kind === 'folder' && !state.collapsed.has(node.id)) visit(node.id, depth + 1, workspaceId)
      }
    }
    const groups = active.mode === 'all'
      ? [...workspaceCatalog().items.map(item => item.workspaceId), null, ...new Set(state.nodes.map(node => node.workspaceId ?? null))]
      : [active.id]
    /* The trash button only makes sense for a single scoped view; 'all' would
       delete files across every workspace, so it disables there. */
    const trash = panel.querySelector('.np-tree-tools [data-action="delete"]')
    if (trash) {
      trash.disabled = active.mode === 'all'
      trash.title = active.mode === 'all' ? `${text().clearUnpinned} · ${text().clearUnpinnedPick}` : text().clearUnpinned
    }
    const seen = new Set()
    for (const workspaceId of groups) {
      const key = workspaceId ?? ''
      if (seen.has(key)) continue
      seen.add(key)
      if (active.mode === 'all') {
        const count = (byParent.get(`${workspaceId ?? ''}`) ?? []).length
        lines.push(`<div class="np-group" role="button" tabindex="0" data-ws="${key}" data-active="${workspaceId === workspaceCatalog().currentId}"><span class="np-group-title">${escapeHtml(workspaceTitle(workspaceId))}</span><span class="np-group-count">${count}</span></div>`)
      }
      visit(null, 0, workspaceId)
    }
    box.innerHTML = lines.join('')
    // the fade mask is sized to the element, so it would clip short names too;
    // mark only rows whose text actually overflows
    requestAnimationFrame(() => {
      for (const name of box.querySelectorAll('.np-node-name')) {
        name.dataset.fade = String(name.scrollWidth > name.clientWidth + 1)
      }
    })
  }

  function renderTabs() {
    const box = must(panel, '.np-tablist')
    box.innerHTML = state.ui.tabs.map(id => {
      const node = state.nodes.find(item => item.id === id)
      if (!node) return ''
      const name = escapeHtml(node.name)
      return `<span class="np-tab" data-active="${id === state.ui.currentId}"><button class="np-tab-btn" type="button" data-tab="${id}" title="${name}"><span class="np-tab-name">${name}</span></button><button class="np-tab-x" type="button" data-close="${id}" title="${escapeHtml(text().close)}" aria-label="${escapeHtml(text().close)}">×</button></span>`
    }).join('')
    /* Fade only when the text itself overflows into the close control. */
    requestAnimationFrame(() => {
      for (const tab of box.querySelectorAll('.np-tab')) {
        const name = tab.querySelector('.np-tab-name')
        const close = tab.querySelector('.np-tab-x')
        if (!name || !close) continue
        const overflows = name.scrollWidth > name.clientWidth + 1
        const hitsClose = name.getBoundingClientRect().right > close.getBoundingClientRect().left + 1
        name.dataset.clipped = String(overflows || hitsClose)
      }
    })
  }

  let renderToken = 0

  function clearEditorSurface() {
    const source = write()
    const read = must(panel, '.np-read')
    const layer = mirror()
    source.value = ''
    source.disabled = false
    source.hidden = false
    read.hidden = true
    read.replaceChildren()
    layer.hidden = true
    layer.replaceChildren()
  }

  async function renderBody() {
    const token = ++renderToken
    const file = current()
    const source = write()
    const read = must(panel, '.np-read')
    if (!file) {
      clearEditorSurface()
      for (const button of panel.querySelectorAll('.np-toolbar [data-format], .np-footer-actions [data-action="save-version"], .np-footer-actions [data-action="clear-file"]')) {
        button.disabled = true
      }
      return
    }
    const rendered = state.view === 'rendered'
    const json = isJson()
    /* JSON files swap the markdown-format cluster for JSON tools. */
    const mdTools = panel.querySelector('.np-md-tools')
    const jsonTools = panel.querySelector('.np-json-tools')
    const viewSwitch = panel.querySelector('.np-switch')
    if (viewSwitch) viewSwitch.hidden = false
    if (mdTools) mdTools.hidden = json
    if (jsonTools) jsonTools.hidden = !json
    for (const button of panel.querySelectorAll('.np-toolbar [data-format]')) {
      button.disabled = rendered || json
    }
    /* Lint badge: strict JSON validation, clicking it jumps to the offset. */
    const lint = panel.querySelector('.np-lint')
    let lintResult = null
    if (json && state.db !== null) {
      lintResult = validateJson(source.value || file.draft || '')
    }
    if (lint) {
      lint.hidden = !json
      if (json && lintResult !== null) {
        const { line, col } = lintResult.ok === false ? positionOf(source.value || file.draft || '', lintResult.pos) : { line: 0, col: 0 }
        lint.dataset.state = lintResult.ok ? 'ok' : 'err'
        lint.dataset.pos = lintResult.ok === false ? String(lintResult.pos) : ''
        lint.textContent = lintResult.ok ? text().jsonOk : `${text().jsonErr} ${line}:${col}`
        lint.title = lintResult.ok ? '' : String(lintResult.message)
      }
    }
    for (const button of panel.querySelectorAll('.np-footer-actions [data-action="save-version"], .np-footer-actions [data-action="clear-file"]')) {
      button.disabled = false
    }
    source.disabled = state.db === null
    /* state.dirty already guards in-flight typing; a focused-but-clean textarea
       must still adopt the file's draft (imports land here mid-focus). */
    if (!state.dirty) source.value = file.draft ?? ''
    source.hidden = rendered
    read.hidden = !rendered
    paintMirror()
    /* Return to the browsing point this file+view had when it was left. The
       key flips on file switch and view toggle, so a paint re-runs exactly
       once per activation and later re-renders leave the user's scroll alone. */
    const posKey = `${file.id}:${rendered ? 'rendered' : 'source'}`
    const wantRestore = state.restoredKey !== posKey
    const savedPos = wantRestore ? state.ui.positions?.[posKey] : undefined
    if (wantRestore) state.restoredKey = posKey
    if (!rendered && savedPos) {
      source.scrollTop = savedPos.scrollTop ?? 0
      if (Number.isFinite(savedPos.selStart)) source.setSelectionRange(savedPos.selStart, savedPos.selEnd ?? savedPos.selStart)
      paintMirror()
    }
    const sw = panel.querySelector('.np-switch')
    if (sw) {
      sw.dataset.view = state.view
      sw.setAttribute('aria-checked', String(rendered))
      const thumb = sw.querySelector('.np-switch-thumb')
      if (thumb) thumb.textContent = rendered ? (json ? text().jsonTree : text().preview) : text().source
      const copy = text()
      const segLabels = json ? [copy.source, copy.jsonTree] : [copy.source, copy.preview]
      sw.querySelectorAll('.np-switch-label').forEach((label, i) => { label.textContent = segLabels[i] ?? segLabels[0] })
    }
    if (!rendered || state.db === null) return
    if (json) {
      const collapsed = jsonCollapsedFor(file.id)
      const parsed = lintResult && lintResult.ok ? lintResult : validateJson(source.value || file.draft || '')
      read.innerHTML = parsed.ok
        ? renderJsonTree(parsed.value, collapsed, escapeHtml)
        : `<p class="np-placeholder">${escapeHtml(text().jsonInvalid)}</p>`
      if (savedPos) read.scrollTop = savedPos.scrollTop ?? 0
      return
    }
    const markdown = state.pendingDraft ?? (source.value || file.draft || '')
    // Cache rendered HTML per (file, image-set, markdown): tree toggles, tab
    // clicks, and theme/locale events re-render without the markdown changing,
    // so they must not re-fetch images or re-decode every data: URL (review-01
    // R10). The key includes imageEpoch so a newly stored image re-renders.
    const cacheKey = `${file.id}${state.imageEpoch}${markdown}`
    const cached = state.renderCache.get(cacheKey)
    if (cached !== undefined) {
      read.innerHTML = cached
      if (savedPos) read.scrollTop = savedPos.scrollTop ?? 0
      return
    }
    const images = await imagesById(state.db, imageIdsIn(markdown))
    if (token !== renderToken) return
    const html = markdown === ''
      ? `<p class="np-placeholder">${escapeHtml(text().placeholder)}</p>`
      : renderMarkdown(markdown, images)
    // Bound the cache; the freshest key is re-inserted last, evict oldest first.
    if (state.renderCache.size >= 64) {
      const oldest = state.renderCache.keys().next().value
      if (oldest !== undefined) state.renderCache.delete(oldest)
    }
    state.renderCache.set(cacheKey, html)
    read.innerHTML = html
    if (savedPos) read.scrollTop = savedPos.scrollTop ?? 0
  }

  function resolvedTheme() {
    if (state.settings.followApp === false && (state.settings.theme === 'light' || state.settings.theme === 'dark')) {
      return state.settings.theme
    }
    if (state.settings.theme === 'light' || state.settings.theme === 'dark') return state.settings.theme
    return appTheme.scheme() === 'light' ? 'light' : 'dark'
  }

  const CHECK_ICON = dshIcon('check-outline')

  function formatBytes(bytes) {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) return String(bytes)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  function workspaceOptions() {
    const copy = text()
    const catalog = workspaceCatalog()
    return [
      ['current', copy.currentWorkspace],
      ['all', copy.allWorkspaces],
      ...catalog.items.map(item => [item.workspaceId, item.title || item.workspaceId]),
      ['unassigned', copy.unassigned],
    ]
  }

  /** Settings and menus are portaled onto document.body, so hiding the panel leaves them on top. */
  function dismissOverlays() {
    closeDialog()
    closeMenu?.()
    closeSlash()
  }

  /** On open, show the active session's workspace. No workspace means Unassigned. */
  function focusSessionWorkspace() {
    if (state.settings.followSessionWorkspace === false) return
    const catalog = workspaceCatalog()
    state.ui.workspaceChoice = catalog.currentId ?? 'unassigned'
  }

  function paintWorkspaceChoices() {
    const label = panel.querySelector('.np-ws-label')
    if (!label) return
    const current = state.ui.workspaceChoice ?? 'all'
    const options = workspaceOptions()
    label.textContent = options.find(([value]) => value === current)?.[1] ?? options[1][1]
  }

  function render() {
    panel.hidden = !state.ui.open
    const theme = resolvedTheme()
    panel.dataset.theme = theme
    entry.dataset.theme = theme
    panel.style.setProperty('--np-editor-font-size', `${state.settings.editorFontSizePx}px`)
    applyCopy()
    const tree = must(panel, '.np-tree')
    const treeCollapsed = state.ui.treeOpen === false
    tree.dataset.collapsed = String(treeCollapsed)
    const treeToggle = must(panel, '.np-tree-toggle')
    treeToggle.innerHTML = treeCollapsed ? PANEL_ICON(false) : PANEL_ICON(true)
    treeToggle.title = treeCollapsed ? text().expandTree : text().collapseTree
    treeToggle.setAttribute('aria-label', treeToggle.title)
    treeToggle.setAttribute('aria-expanded', String(!treeCollapsed))
    paintWorkspaceChoices()
    renderTree()
    renderTabs()
    renderChrome()
    /* Reset the scrollable toolbar to its start on every render so a file or
       view switch never opens already scrolled to the clipped end. */
    const toolbar = panel.querySelector('.np-toolbar')
    if (toolbar) toolbar.scrollLeft = 0
    void renderBody()
    paintStatus()
    requestAnimationFrame(() => {
      applyWindowSize()
      place(entry, state.ui.entryX, state.ui.entryY, 72)
      if (!state.maximized) place(panel, state.ui.panelX, state.ui.panelY, 80)
      // tooltip reads left of the entry; flip when it would clip offscreen
      entry.classList.toggle('np-tip-left', entry.getBoundingClientRect().left < 96)
    })
  }

  async function persistUi() {
    if (state.db) await writeUi(state.db, state.ui)
  }

  /** Write any pending draft immediately so switching files never loses input. */
  function flushSave() {
    window.clearTimeout(state.saveTimer)
    touchPosition()
    if (!state.dirty) return
    state.dirty = false
    const file = state.nodes.find(node => node.id === state.pendingFileId) ?? current()
    const draft = state.pendingDraft ?? write().value
    state.pendingFileId = null
    state.pendingDraft = null
    if (!file || !state.db) return
    file.draft = draft
    state.lastDraftWrite[file.id] = Date.now()
    setSync('saving')
    void saveDraft(state.db, file.id, draft).then(() => {
      setSync('saved')
      channel?.postMessage({ type: 'changed', fileId: file.id })
    }).catch(showError)
  }

  /** fileId → last browse point, kept on `state.ui.positions` so it survives
      reloads. Source remembers scroll + caret; preview remembers scroll. */
  function touchPosition() {
    const file = current()
    if (!file) return
    if (state.ui.positions === undefined || state.ui.positions === null || typeof state.ui.positions !== 'object') state.ui.positions = {}
    const key = `${file.id}:${state.view === 'rendered' ? 'rendered' : 'source'}`
    state.ui.positions[key] = state.view === 'rendered'
      ? { scrollTop: must(panel, '.np-read').scrollTop }
      : { scrollTop: write().scrollTop, selStart: write().selectionStart, selEnd: write().selectionEnd }
    scheduleUiPersist()
  }
  let uiPersistTimer = /** @type {number | undefined} */ (undefined)
  /** Batched `persistUi` for high-frequency events (scroll, caret moves). */
  function scheduleUiPersist() {
    window.clearTimeout(uiPersistTimer)
    uiPersistTimer = window.setTimeout(() => void persistUi(), 500)
  }

  function openFile(id) {
    flushSave()
    if (!state.ui.tabs.includes(id)) state.ui.tabs.push(id)
    state.ui.currentId = id
    state.ui.open = true
    render()
    void persistUi()
  }

  function selectedParent() {
    const selected = state.nodes.find(node => node.id === state.ui.currentId)
    return {
      parentId: selected?.kind === 'folder' ? selected.id : selected?.parentId ?? null,
      workspaceId: selected ? selected.workspaceId ?? null : activeWorkspace().id,
    }
  }

  async function add(kind) {
    if (!state.db) return
    const destination = selectedParent()
    const siblings = state.nodes.filter(node => node.parentId === destination.parentId && (node.workspaceId ?? null) === destination.workspaceId)
    const name = kind === 'file' ? nextUntitled(siblings) : `folder-${siblings.length + 1}`
    const node = await createNode(state.db, kind, destination.parentId, name, destination.workspaceId)
    state.nodes.push(node)
    if (kind === 'file') {
      state.view = 'source'
      openFile(node.id)
    } else { state.ui.currentId = node.id; render() }
    channel?.postMessage({ type: 'changed' })
    return node
  }

  async function beginWriting() {
    if (!state.db) return
    if (!current()) await add('file')
    state.view = 'source'
    closeSlash()
    await renderBody()
    const source = write()
    source.hidden = false
    source.disabled = false
    source.focus()
  }

  let closeMenu = /** @type {(() => void) | null} */ (null)
  let closeDialog = () => {}
  let dialogOpen = false
  /* the ws button sits outside the anchored menu, so its own pointerdown makes
     NanoMenu close the menu before the click — suppress the immediate reopen. */
  let wsToggleJustClosed = false

  /**
   * Every card is a shared NanoDialog now (mounted into document.body by the
   * adapter). `spec.body` is the old inner HTML; `spec.setup(el, close)` runs on
   * the live content node so callers keep wiring the same inputs/switches.
   * Escape, mask click, focus trap, and focus return are the Modal's job.
   */
  function dialog(spec) {
    closeSlash()
    closeMenu?.()
    let handle = /** @type {{ close: () => void } | undefined} */ (undefined)
    const finish = () => { dialogOpen = false; if (closeDialog === closeSelf) closeDialog = () => {} }
    // every exit path — footer buttons, Escape, mask, programmatic close —
    // funnels through finish()+adapter close so the panel guards release.
    const closeSelf = () => { if (!dialogOpen || !handle) return; finish(); handle.close() }
    closeDialog = closeSelf
    dialogOpen = true
    handle = openNanoDialog({
      copy: text(),
      title: spec.title,
      description: spec.description,
      confirmLabel: spec.confirmLabel,
      danger: spec.danger === true,
      footer: spec.footer?.(closeSelf),
      maxHeight: Math.round(panel.getBoundingClientRect().height * 0.8),
      width: Math.round(panel.getBoundingClientRect().width * 0.6),
      region: panel.getBoundingClientRect(),
      onConfirm: () => spec.onConfirm?.(closeSelf),
      onCancel: () => { finish(); spec.onCancel?.() },
      children: React.createElement('div', {
        className: 'np-dlg-body',
        dangerouslySetInnerHTML: { __html: spec.body },
        ref: el => { if (el) spec.setup?.(el, closeSelf) },
      }),
    })
  }

  /**
   * Workspace switcher as a shared NanoMenu. NanoMenu self-closes on Escape,
   * outside press, or an item running; `done(unmount)` tracks whether the menu
   * is actually gone so we never unmount twice and always release aria/focus.
   */
  function openWorkspaceMenu(anchor) {
    closeMenu?.()
    anchor.setAttribute('aria-expanded', 'true')
    const current = state.ui.workspaceChoice ?? 'all'
    const check = React.createElement('span', { dangerouslySetInnerHTML: { __html: CHECK_ICON } })
    const items = workspaceOptions().map(([value, name]) => ({
      id: value,
      label: name,
      icon: value === current ? check : undefined,
      run: () => {
        flushSave()
        state.ui.workspaceChoice = value
        state.ui.currentId = null
        render()
        void persistUi()
        // NanoMenu unmounts itself before run(); release our bookkeeping too.
        done(false)
      },
    }))
    /* The portal sits on document.body and would happily outgrow the floating
       window — cap it at the space actually left inside the panel. */
    const room = panel.getBoundingClientRect().bottom - anchor.getBoundingClientRect().bottom - 10
    const raw = openNanoMenu({ anchor: anchor.getBoundingClientRect(), items, width: 190, maxHeight: Math.max(120, room), gap: 4 })
    let closed = false
    const done = (unmount) => {
      if (closed) return
      closed = true
      closeMenu = null
      anchor.setAttribute('aria-expanded', 'false')
      document.removeEventListener('keydown', esc, true)
      document.removeEventListener('pointerdown', out, true)
      if (unmount) { raw.close(); if (anchor.isConnected) anchor.focus() }
    }
    const esc = event => {
      if (event.key !== 'Escape' || !closeMenu) return
      event.stopPropagation()
      event.preventDefault()
      // the notepad's own Esc listener fires first and already called done(true);
      // this is only a fallback for orderings where NanoMenu handled it instead.
      done(false)
    }
    const out = event => {
      if (!closeMenu || !(event.target instanceof Element)) return
      if (event.target.closest('.nano-menu')) return
      // NanoMenu's own outside handler already unmounted; just release state. A
      // press on the switcher button itself counts as "click again to close" —
      // the flag lasts until the next click anywhere so a drag-off can't eat it.
      if (event.target.closest('.np-ws')) {
        wsToggleJustClosed = true
        document.addEventListener('click', () => { wsToggleJustClosed = false }, { once: true })
      }
      done(false)
    }
    closeMenu = () => done(true)
    document.addEventListener('keydown', esc, true)
    document.addEventListener('pointerdown', out, true)
  }

  /** One + button: blank file or blank folder. */
  function openCreateMenu(anchor) {
    closeMenu?.()
    anchor.setAttribute('aria-expanded', 'true')
    const icon = markup => React.createElement('span', { dangerouslySetInnerHTML: { __html: markup } })
    const items = [
      { id: 'file', label: text().newBlankFile, icon: icon(FILE_ICON), run: () => { done(false); void add('file').catch(showError) } },
      { id: 'folder', label: text().newBlankFolder, icon: icon(FOLDER_ICON), run: () => { done(false); void add('folder').catch(showError) } },
    ]
    const raw = openNanoMenu({ anchor: anchor.getBoundingClientRect(), items, width: 180 })
    let closed = false
    const done = (unmount) => {
      if (closed) return
      closed = true
      closeMenu = null
      anchor.setAttribute('aria-expanded', 'false')
      if (unmount) raw.close()
    }
    closeMenu = () => done(true)
  }

  function askName(title, initial, done) {
    let input = /** @type {HTMLInputElement | null} */ (null)
    const submit = close => { if (input) { close(); void done(input.value).catch(showError) } }
    dialog({
      title,
      body: `<input name="node-name" value="${escapeHtml(initial)}" aria-label="${escapeHtml(title)}" data-modal-autofocus>`,
      onConfirm: close => submit(close),
      setup: (el, close) => {
        input = el.querySelector('[name="node-name"]')
        if (!(input instanceof HTMLInputElement)) return
        input.select()
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); submit(close) }
        })
      },
    })
  }

  function scheduleSave() {
    state.dirty = true
    state.pendingFileId = state.ui.currentId
    state.pendingDraft = write().value
    setSync('dirty')
    window.clearTimeout(state.saveTimer)
    if (state.settings.autoSave === false) return
    /* rolling draft slot: DB overwrite at most once per draftIntervalMs (default 3 min) */
    const fileId = state.pendingFileId
    const elapsed = Date.now() - (state.lastDraftWrite[fileId] ?? 0)
    const wait = Math.max(state.settings.saveDelayMs, state.settings.draftIntervalMs - elapsed)
    state.saveTimer = window.setTimeout(() => {
      const file = state.nodes.find(node => node.id === state.pendingFileId)
      const draft = state.pendingDraft ?? ''
      state.dirty = false
      state.pendingFileId = null
      state.pendingDraft = null
      if (!file || !state.db) return
      file.draft = draft
      state.lastDraftWrite[file.id] = Date.now()
      setSync('saving')
      void saveDraft(state.db, file.id, draft).then(() => {
        setSync('saved')
        channel?.postMessage({ type: 'changed', fileId: file.id })
      }).catch(showError)
    }, wait)
  }

  async function commit(reason) {
    flushSave()
    const file = current()
    if (!file || !state.db) return null
    const text = file.draft ?? ''
    if (text === '' && reason === 'interval') return null
    setSync('saving')
    const version = await commitVersion(state.db, file.id, text, reason, state.settings.versionLimit)
    setSync(version ? 'committed' : 'saved')
    return version
  }

  async function forget(id) {
    if (!state.db) return
    flushSave()
    await deleteNode(state.db, id)
    const removed = new Set([id])
    let grew = true
    while (grew) {
      grew = false
      for (const node of state.nodes) {
        if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
          removed.add(node.id)
          grew = true
        }
      }
    }
    state.nodes = state.nodes.filter(node => !removed.has(node.id))
    for (const gone of removed) state.collapsed.delete(gone)
    state.ui.tabs = state.ui.tabs.filter(tab => !removed.has(tab))
    if (state.ui.currentId && removed.has(state.ui.currentId)) state.ui.currentId = state.ui.tabs.at(-1) ?? null
    render()
    void persistUi()
    channel?.postMessage({ type: 'changed' })
  }

  async function clearCurrentFile() {
    const file = current()
    if (!file || !state.db) return
    file.draft = ''
    write().value = ''
    state.dirty = false
    await commit('manual')
    render()
  }

  function armCommit() {
    window.clearInterval(state.commitTimer)
    state.commitTimer = window.setInterval(() => {
      if (state.ui.open) void commit('interval').catch(showError)
    }, state.settings.commitIntervalSec * 1000)
  }

  function openSettings() {
    const values = state.settings
    const copy = text()
    /* `factor` converts between the stored unit (ms/s) and what the input
       * shows: display = value/factor, write-back = input×factor. */
    const num = (name, unit, value, desc, range, factor = 1) => `
      <div class="np-field"><div class="np-field-text"><span class="np-field-name">${escapeHtml(desc)}</span><span class="np-field-desc">${escapeHtml(range)}</span></div>
      <span class="np-num"><input name="${name}" type="number" step="${factor > 1 ? 'any' : '1'}" value="${factor > 1 ? value / factor : value}" data-factor="${factor}"><i class="np-num-unit">${escapeHtml(unit)}</i></span></div>`
    /* N-segment sliding switch — same anatomy as the toolbar view switch */
    const sw = (field, desc, hint, options) => {
      const current = field === 'autoSave' || field === 'followSessionWorkspace' ? String(values[field] !== false) : String(values[field])
      const index = Math.max(0, options.findIndex(o => String(o.value) === current))
      const labels = options.map(o => `<span class="np-switch-label">${escapeHtml(o.label)}</span>`).join('')
      return `
      <div class="np-field"><div class="np-field-text"><span class="np-field-name">${escapeHtml(desc)}</span><span class="np-field-desc">${escapeHtml(hint)}</span></div>
      <button type="button" class="np-switch" data-seg-field="${field}" role="switch" aria-checked="${index === 0}" style="--np-switch-n:${options.length};--np-switch-i:${index}"><span class="np-switch-thumb">${escapeHtml(options[index].label)}</span>${labels}</button></div>`
    }
    dialog({
      title: copy.settingsTitle,
      body: `<section class="np-section">
        ${sw('followSessionWorkspace', copy.followSessionWorkspace, copy.followSessionWorkspaceHint, [
          { value: 'true', label: copy.autoSaveOn },
          { value: 'false', label: copy.autoSaveOff },
        ])}
        ${sw('autoSave', copy.autoSave, copy.autoSaveHint, [
          { value: 'true', label: copy.autoSaveOn },
          { value: 'false', label: copy.autoSaveOff },
        ])}
        ${num('draftIntervalMs', copy.unitSeconds, values.draftIntervalMs, copy.draftInterval, copy.draftIntervalHint, 1000)}
        ${num('commitIntervalSec', copy.unitMinutes, values.commitIntervalSec, copy.commitInterval, copy.commitIntervalHint, 60)}
        ${num('versionLimit', '', values.versionLimit, copy.versionLimit, copy.versionLimitHint)}
      </section>
      <section class="np-section">
        ${sw('defaultView', copy.openAs, copy.openAsHint, [
          { value: 'rendered', label: copy.rendered },
          { value: 'source', label: copy.source },
        ])}
        ${sw('theme', copy.windowTheme, copy.windowThemeHint, [
          { value: 'dark', label: copy.dark },
          { value: 'light', label: copy.light },
          { value: 'system', label: copy.followApp },
        ])}
        ${num('editorFontSizePx', 'px', values.editorFontSizePx, copy.editorFontSize, copy.editorFontSizeHint)}
      </section>
      <section class="np-section">
        ${sw('chromeStyle', copy.chromeStyle, copy.chromeStyleHint, [
          { value: 'mac', label: copy.mac },
          { value: 'windows', label: copy.windows },
        ])}
      </section>
      <section class="np-section">
        ${num('imageLimitBytes', copy.unitMb, values.imageLimitBytes, copy.imageLimit, copy.imageLimitHint, 1048576)}
        <div class="np-field"><div class="np-field-text"><span class="np-field-name">${escapeHtml(copy.storageHeading)}</span><span class="np-field-desc">${escapeHtml(copy.storageHint)}</span></div><span class="np-usage-val"><span class="np-usage-chip u-files">${dshIcon('browse-outline')}<b></b></span><span class="np-usage-chip u-versions">${dshIcon('clock-outline')}<b></b></span><span class="np-usage-chip u-images">${dshIcon('apps-add-outline')}<b></b></span><span class="np-usage-chip u-size">${dshIcon('database-outline')}<b></b></span></span></div>
      </section>
      <section class="np-section">
        <div class="np-field"><div class="np-field-text"><span class="np-field-name">${escapeHtml(copy.positionHeading)}</span><span class="np-field-desc">${escapeHtml(copy.resetPosition)}</span></div><button type="button" data-go="reset-position">${escapeHtml(copy.reset)}</button></div>
      </section>
      <section class="np-section">
        <div class="np-field"><div class="np-field-text"><span class="np-field-name">${escapeHtml(copy.dangerHeading)}</span><span class="np-field-desc">${escapeHtml(copy.dangerBody)}</span></div><button type="button" class="np-danger" data-go="clear">${escapeHtml(copy.clearAllTitle)}</button></div>
      </section>`,
      onConfirm: close => close(),
      setup: (el, close) => {
      /* segment option tables — values mirror normalizeSettings */
      const SW_OPTIONS = {
        autoSave: [
          { value: 'true', label: copy.autoSaveOn },
          { value: 'false', label: copy.autoSaveOff },
        ],
        defaultView: [
          { value: 'rendered', label: copy.rendered },
          { value: 'source', label: copy.source },
        ],
        theme: [
          { value: 'dark', label: copy.dark },
          { value: 'light', label: copy.light },
          { value: 'system', label: copy.followApp },
        ],
        chromeStyle: [
          { value: 'mac', label: copy.mac },
          { value: 'windows', label: copy.windows },
        ],
        followSessionWorkspace: [
          { value: 'true', label: copy.autoSaveOn },
          { value: 'false', label: copy.autoSaveOff },
        ],
      }
      if (state.db) void counts(state.db).then(async value => {
        const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : {}
        const chips = { '.u-files': [value.files, text().usageFiles], '.u-versions': [value.versions, text().usageVersions], '.u-images': [value.images, text().usageImages], '.u-size': [formatBytes(estimate.usage ?? 0), text().storageHeading] }
        for (const [sel, [val, label]] of Object.entries(chips)) {
          const chip = el.querySelector(`.np-usage-chip${sel}`)
          if (!chip) continue
          chip.title = `${val} ${label}`
          chip.setAttribute('aria-label', `${val} ${label}`)
          chip.querySelector('b').textContent = String(val)
        }
      })
      el.addEventListener('click', event => {
        /* N-segment switch: pick the segment under the pointer, slide the labelled thumb */
        const seg = event.target instanceof HTMLElement ? event.target.closest('.np-switch[data-seg-field]') : null
        if (seg) {
          const field = seg.dataset.segField
          const options = SW_OPTIONS[field]
          if (!options) return
          const rect = seg.getBoundingClientRect()
          const index = Math.min(options.length - 1, Math.max(0, Math.floor((event.clientX - rect.left) / (rect.width / options.length))))
          const merged = { ...state.settings }
          if (field === 'autoSave' || field === 'followSessionWorkspace') merged[field] = options[index].value === 'true'
          else merged[field] = options[index].value
          state.settings = normalizeSettings(merged)
          if (state.db) void writeSettings(state.db, state.settings).catch(showError)
          const value = field === 'autoSave' || field === 'followSessionWorkspace' ? String(state.settings[field] !== false) : String(state.settings[field])
          const active = Math.max(0, options.findIndex(o => String(o.value) === value))
          seg.style.setProperty('--np-switch-i', String(active))
          seg.setAttribute('aria-checked', String(active === 0))
          seg.querySelector('.np-switch-thumb').textContent = options[active].label
          render()
          return
        }
        const action = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (action === 'reset-position') {
          state.ui.entryX = null
          state.ui.entryY = null
          state.ui.panelX = null
          state.ui.panelY = null
          state.ui.panelW = null
          state.ui.panelH = null
          panel.style.width = ''
          panel.style.height = ''
          render()
          void persistUi()
        }
        if (action === 'clear') { close(); confirmClear() }
      })
      const settingNames = ['saveDelayMs', 'draftIntervalMs', 'commitIntervalSec', 'versionLimit', 'imageLimitBytes', 'editorFontSizePx']
      el.addEventListener('change', () => {
        const merged = { ...state.settings }
        let rejected = false
        for (const input of el.querySelectorAll('input, select')) {
          if (!settingNames.includes(input.name)) continue
          const factor = Number(input.dataset.factor ?? 1) || 1
          const value = input.type === 'number' ? Number(input.value) * factor : input.value
          const trial = normalizeSettings({ ...state.settings, [input.name]: value })
          if (trial[input.name] === value) merged[input.name] = value
          else rejected = true
        }
        state.settings = merged
        for (const input of el.querySelectorAll('input, select')) {
          if (settingNames.includes(input.name)) input.value = merged[input.name] / (Number(input.dataset.factor ?? 1) || 1)
        }
        let note = el.querySelector('.np-setting-note')
        if (rejected) {
          if (!note) {
            note = document.createElement('p')
            note.className = 'np-setting-note'
            el.append(note)
          }
          note.textContent = text().invalidSetting
          return
        }
        note?.remove()
        if (state.db) void writeSettings(state.db, merged).catch(showError)
        armCommit()
        render()
      })
      },
    })
  }

  function confirmClearFile() {
    const file = current()
    if (!file) return
    const copy = text()
    dialog({
      title: copy.clearFileTitle,
      description: copy.clearFileBody(file.name),
      danger: true,
      confirmLabel: copy.clear,
      onConfirm: close => void clearCurrentFile().then(close).catch(showError),
    })
  }

  /* `closeSettings` is invoked by the caller BEFORE this opens — the old mask
     swapped cards in place, so the settings card has to be gone before the
     clear-all card mounts, not after. */
  function confirmClear() {
    const copy = text()
    dialog({
      title: copy.clearAllTitle,
      description: copy.clearAllBody,
      danger: true,
      confirmLabel: copy.deleteAll,
      onConfirm: close => {
        if (!state.db) return
        flushSave()
        void clearContent(state.db).then(() => {
          state.nodes = []
          state.ui.tabs = []
          state.ui.currentId = null
          close()
          render()
        }).catch(showError)
      },
    })
  }

  /** Header trash button: every unpinned file in the scoped workspace view. */
  function confirmClearUnpinned() {
    if (!state.db) return
    const active = activeWorkspace()
    if (active.mode !== 'one') return
    const files = state.nodes.filter(node => node.kind === 'file' && node.pinned !== true && (node.workspaceId ?? null) === active.id)
    if (files.length === 0) return
    const copy = text()
    dialog({
      title: copy.clearUnpinnedTitle,
      description: copy.clearUnpinnedBody(files.length, workspaceTitle(active.id)),
      danger: true,
      confirmLabel: copy.deleteAll,
      onConfirm: close => {
        if (!state.db) return
        flushSave()
        const ids = files.map(node => node.id)
        void deleteNodes(state.db, ids).then(() => {
          const removed = new Set(ids)
          let grew = true
          while (grew) {
            grew = false
            for (const node of state.nodes) {
              if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
                removed.add(node.id)
                grew = true
              }
            }
          }
          state.nodes = state.nodes.filter(node => !removed.has(node.id))
          for (const gone of removed) state.collapsed.delete(gone)
          state.ui.tabs = state.ui.tabs.filter(tab => !removed.has(tab))
          if (state.ui.currentId && removed.has(state.ui.currentId)) state.ui.currentId = state.ui.tabs.at(-1) ?? null
          close()
          render()
          void persistUi()
          channel?.postMessage({ type: 'changed' })
        }).catch(showError)
      },
    })
  }

  async function openHistory() {
    const file = current()
    if (!file || !state.db) return
    const versions = await versionsOf(state.db, file.id)
    const copy = text()
    const rows = versions.map(version => `<button type="button" data-version="${version.id}">${escapeHtml(new Date(version.createdAt).toLocaleString())} · ${escapeHtml(copy.reasons[version.reason] ?? version.reason)} · ${version.markdown.length} chars</button>`).join('')
    dialog({
      title: copy.historyTitle,
      body: `<div class="np-versions">${rows || `<p>${escapeHtml(copy.noVersions)}</p>`}</div>`,
      confirmLabel: copy.close,
      onConfirm: close => close(),
      setup: (el, close) => {
        el.addEventListener('click', event => {
          const target = event.target instanceof HTMLElement ? event.target : null
          const id = target?.dataset.version
          const version = versions.find(item => item.id === id)
          if (!version) return
          // one card at a time, like the old mask — close history, show preview.
          close()
          const previewCopy = text()
          let armed = false
          let note = /** @type {HTMLElement | null} */ (null)
          dialog({
            title: previewCopy.previewAt(new Date(version.createdAt).toLocaleString()),
            body: `<pre>${escapeHtml(version.markdown)}</pre><p class="np-restore-note" hidden>${escapeHtml(previewCopy.confirmRestore)}</p>`,
            confirmLabel: previewCopy.restore,
            onCancel: () => void openHistory().catch(showError),
            onConfirm: closePreview => {
              // restore needs a second click, like the old inline armed button.
              if (!armed) {
                armed = true
                note?.removeAttribute('hidden')
                return
              }
              write().value = version.markdown
              const live = current()
              if (live) live.draft = version.markdown
              void commit('restore').then(() => { closePreview(); render() }).catch(showError)
            },
            setup: el => { note = el.querySelector('.np-restore-note') },
          })
        })
      },
    })
  }

  /* `handle` is the strip that takes pointer events; `target` is what moves.
     They differ for the window: the grab strips are static-positioned inside
     it, so styling the handle itself moves nothing. */
  function drag(handle, onEnd, target = handle) {
    let startX = 0
    let startY = 0
    let originX = 0
    let originY = 0
    let moved = false
    const move = event => {
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.hypot(dx, dy) > 4) moved = true
      place(target, originX + dx, originY + dy)
      /* Write live coordinates into state too, so any render() landing mid-drag
         re-places the target where it already is instead of snapping it back. */
      if (target === panel) { state.ui.panelX = target.offsetLeft; state.ui.panelY = target.offsetTop }
      if (target === entry) { state.ui.entryX = target.offsetLeft; state.ui.entryY = target.offsetTop }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onEnd(moved, target.offsetLeft, target.offsetTop)
    }
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      /* The window has no position to move while maximized — ignore the grab. */
      if (target === panel && state.maximized) return
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, a, select') && event.target !== handle) return
      startX = event.clientX
      startY = event.clientY
      originX = target.offsetLeft
      originY = target.offsetTop
      moved = false
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    })
  }

  drag(entry, (moved, x, y) => {
    entry.classList.toggle('np-tip-left', entry.getBoundingClientRect().left < 96)
    if (moved) {
      state.ui.entryX = x
      state.ui.entryY = y
      void persistUi()
      return
    }
    const opening = !state.ui.open
    if (opening) focusSessionWorkspace()
    else dismissOverlays()
    state.ui.open = opening
    render()
    void persistUi()
  })
  const tree = must(panel, '.np-tree')
  tree.addEventListener('dragstart', event => {
    const row = event.target instanceof HTMLElement ? event.target.closest('[data-id]') : null
    if (!row || !event.dataTransfer) return
    event.dataTransfer.setData('text/plain', row.dataset.id ?? '')
    event.dataTransfer.effectAllowed = 'move'
  })
  let dropRow = null
  const clearDropMark = () => {
    dropRow?.removeAttribute('data-drop')
    dropRow = null
  }
  const markDrop = event => {
    clearDropMark()
    const row = event.target instanceof HTMLElement ? event.target.closest('[data-id]') : null
    if (row) {
      dropRow = row
      row.dataset.drop = 'true'
    }
  }
  tree.addEventListener('dragover', event => {
    if (!event.dataTransfer?.types.includes('text/plain')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    markDrop(event)
  })
  tree.addEventListener('dragleave', event => {
    if (event.relatedTarget instanceof Node && tree.contains(event.relatedTarget)) return
    clearDropMark()
  })
  tree.addEventListener('drop', event => {
    if (!event.dataTransfer?.types.includes('text/plain')) return
    event.preventDefault()
    event.stopPropagation()
    clearDropMark()
    const id = event.dataTransfer?.getData('text/plain')
    if (!id || !state.db) return
    const target = event.target instanceof HTMLElement ? event.target : null
    const group = target?.closest?.('[data-ws]')
    const row = target?.closest?.('[data-id]')
    const node = row ? state.nodes.find(item => item.id === row.dataset.id) : null
    const parentId = node ? (node.kind === 'folder' ? node.id : node.parentId) : null
    const workspaceId = node ? node.workspaceId ?? null
      : group ? (group.dataset.ws || null)
      : activeWorkspace().id
    void moveNode(state.db, id, parentId, workspaceId).then(async moved => {
      // reload from db: moving a folder cascades workspaceId onto its descendants
      const snapshot = await loadSnapshot(state.db)
      state.nodes = snapshot.nodes
      state.renderCache.clear()
      void moved
      render()
      channel?.postMessage({ type: 'changed' })
    }).catch(showError)
  })
  for (const handle of panel.querySelectorAll('.np-resize')) {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const edge = handle.dataset.edge ?? ''
      const startX = event.clientX
      const startY = event.clientY
      const origin = panel.getBoundingClientRect()
      const move = (pointer) => {
        const dx = pointer.clientX - startX
        const dy = pointer.clientY - startY
        let width = origin.width
        let height = origin.height
        let left = origin.left
        let top = origin.top
        if (edge.includes('e')) width = origin.width + dx
        if (edge.includes('s')) height = origin.height + dy
        if (edge.includes('w')) width = origin.width - dx
        if (edge.includes('n')) height = origin.height - dy
        width = clamp(width, 320, window.innerWidth - 16)
        height = clamp(height, 240, window.innerHeight - 16)
        if (edge.includes('w')) left = origin.right - width
        if (edge.includes('n')) top = origin.bottom - height
        panel.style.width = `${width}px`
        panel.style.height = `${height}px`
        place(panel, left, top)
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        state.ui.panelW = panel.offsetWidth
        state.ui.panelH = panel.offsetHeight
        state.ui.panelX = panel.offsetLeft
        state.ui.panelY = panel.offsetTop
        void persistUi()
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    })
  }
  /* Every blank strip along the top edge is a window-grab surface: the tabs
     bar, the format toolbar, and the workspace tree header. Each moves the
     panel, not itself. */
  const grabWindow = (moved, x, y) => {
    if (!moved) return
    state.ui.panelX = x
    state.ui.panelY = y
    void persistUi()
  }
  for (const strip of ['.np-tabs', '.np-toolbar', '.np-tree-head']) {
    const handle = panel.querySelector(strip)
    if (handle) drag(handle, grabWindow, panel)
  }

  function requestDelete(id) {
    if (!state.db) return
    const node = state.nodes.find(item => item.id === id)
    if (!node) return
    const copy = text()
    const nested = state.nodes.some(item => item.parentId === id)
    const title = node.kind === 'folder' ? copy.deleteFolderTitle : copy.deleteFileTitle
    const body = node.kind === 'folder' ? (nested ? copy.deleteFolderBody : copy.deleteEmptyFolderBody) : copy.deleteFileBody(node.name)
    dialog({
      title,
      description: body,
      danger: true,
      confirmLabel: copy.delete,
      onConfirm: close => { close(); void forget(id) },
    })
  }

  /** Row ⋯ menu: rename/delete live inside so the row itself stays at two icon buttons. */
  function openNodeMenu(id, anchor) {
    const node = state.nodes.find(item => item.id === id)
    if (!node || !state.db) return
    closeMenu?.()
    const copy = text()
    const raw = openNanoMenu({
      anchor: anchor.getBoundingClientRect(), width: 160,
      items: [
        { id: 'rename', label: copy.rename, run: () => askName(copy.renameTitle, node.name, async name => {
          const renamed = await renameNode(state.db, node.id, name)
          Object.assign(node, renamed)
          render()
        }) },
        { id: 'delete', label: copy.delete, tone: 'danger', run: () => requestDelete(id) },
      ],
    })
    closeMenu = () => raw.close()
  }

  /**
   * Transfer card: pick a workspace row, then footer offers move or copy. Same
   * NanoDialog shell — the stock Cancel/Confirm footer is replaced because the
   * dialog carries two primary verbs.
   */
  function openTransfer(id) {
    const node = state.nodes.find(item => item.id === id)
    if (!node || !state.db) return
    const copy = text()
    const items = workspaceCatalog().items.filter(item => (item.workspaceId ?? null) !== (node.workspaceId ?? null))
    const keyOf = workspaceId => workspaceId ?? '__none__'
    let picked = items.length > 0 ? keyOf(items[0].workspaceId ?? null) : null
    dialog({
      title: copy.transferTitle,
      body: `<div class="np-transfer-list">${items.length === 0
        ? `<p class="np-transfer-empty">${escapeHtml(copy.noOtherWorkspace)}</p>`
        : items.map(item => `<button type="button" class="np-transfer-row" data-ws="${keyOf(item.workspaceId ?? null)}"><span class="np-transfer-name">${escapeHtml(item.title ?? workspaceTitle(item.workspaceId))}</span><span class="np-transfer-check" aria-hidden="true">${CHECK_ICON}</span></button>`).join('')}</div>`,
      setup: el => {
        const paint = () => { for (const row of el.querySelectorAll('.np-transfer-row')) row.dataset.active = String(row.dataset.ws === picked) }
        paint()
        el.addEventListener('click', event => {
          const row = event.target instanceof Element ? event.target.closest('.np-transfer-row') : null
          if (row?.dataset.ws !== undefined) { picked = row.dataset.ws; paint() }
        })
      },
      footer: close => React.createElement(React.Fragment, null,
        React.createElement(Button, { variant: 'outline', className: 'nano-modal-action', onClick: close }, copy.cancel),
        React.createElement(Button, {
          variant: 'outline', className: 'nano-modal-action', disabled: picked === null,
          onClick: async () => {
            close()
            if (picked === null) return
            const clone = await copyNode(state.db, node.id, picked === '__none__' ? null : picked).catch(showError)
            if (clone === undefined) return
            const snapshot = await loadSnapshot(state.db)
            state.nodes = snapshot.nodes
            state.renderCache.clear()
            render()
            channel?.postMessage({ type: 'changed' })
          },
        }, copy.copyAction),
        React.createElement(Button, {
          variant: 'primary', className: 'nano-modal-action', disabled: picked === null,
          onClick: async () => {
            close()
            if (picked === null) return
            await moveNode(state.db, node.id, null, picked === '__none__' ? null : picked).catch(showError)
            const snapshot = await loadSnapshot(state.db)
            state.nodes = snapshot.nodes
            state.renderCache.clear()
            render()
            channel?.postMessage({ type: 'changed' })
          },
        }, copy.transfer)),
    })
  }

  panel.addEventListener('click', event => {
    const caret = event.target instanceof Element ? event.target.closest('[data-caret]') : null
    if (caret?.dataset.caret) {
      const id = caret.dataset.caret
      if (state.collapsed.has(id)) state.collapsed.delete(id)
      else state.collapsed.add(id)
      render()
      return
    }
    const rowAction = event.target instanceof Element ? event.target.closest('[data-pin], [data-move], [data-more]') : null
    if (rowAction?.dataset.pin && state.db) {
      const node = state.nodes.find(item => item.id === rowAction.dataset.pin)
      if (node) void pinNode(state.db, node.id, node.pinned !== true).then(updated => {
        Object.assign(node, updated)
        render()
      }).catch(showError)
      return
    }
    if (rowAction?.dataset.move) {
      openTransfer(rowAction.dataset.move)
      return
    }
    if (rowAction?.dataset.more) {
      openNodeMenu(rowAction.dataset.more, rowAction)
      return
    }
    const target = event.target instanceof Element ? event.target.closest('[data-action], [data-format], [data-json], [data-tab], [data-close], [data-id], [data-ws], .np-lint') : null
    if (!(target instanceof HTMLElement)) return
    const action = target.dataset.action
    if (action === 'ws-toggle') {
      if (wsToggleJustClosed) { wsToggleJustClosed = false; return }
      openWorkspaceMenu(target)
      return
    }
    if (action === 'close' || action === 'tree') {
      flushSave()
      dismissOverlays()
      state.ui.open = false
      write().blur()
      render()
      void persistUi()
    }
    if (action === 'maximize') toggleMaximize()
    if (action === 'settings') openSettings()
    if (action === 'toggle-tree') {
      state.ui.treeOpen = state.ui.treeOpen === false
      render()
      void persistUi()
    }
    if (action === 'toggle-tools') {
      state.toolsOpen = !state.toolsOpen
      render()
    }
    if (action === 'new-item') { openCreateMenu(target); return }
    if (action === 'new-file') void add('file').catch(showError)
    if (action === 'close-tabs') {
      /* Save the active draft first (other tabs were already flushed when the
         user last left them), then drop every tab — no confirmation. */
      flushSave()
      state.ui.tabs = []
      state.ui.currentId = null
      render()
      void persistUi()
    }
    if (action === 'new-folder') void add('folder').catch(showError)
    if (action === 'rename' && state.ui.currentId) {
      const node = state.nodes.find(item => item.id === state.ui.currentId)
      if (node && state.db) askName(text().renameTitle, node.name, async name => {
        const renamed = await renameNode(state.db, node.id, name)
        Object.assign(node, renamed)
        render()
      })
    }
    if (action === 'delete') confirmClearUnpinned()
    if (action === 'clear-file') confirmClearFile()
    if (action === 'save-version') void commit('manual').catch(showError)
    if (action === 'view') {
      state.view = state.view === 'rendered' ? 'source' : 'rendered'
      void renderBody()
    }
    if (action === 'export-file') void exportFile()
    if (action === 'history') void openHistory().catch(showError)
    if (action === 'dismiss-error' || action === 'keep-mine') must(panel, '.np-error').hidden = true
    if (action === 'load-remote' && state.db) {
      must(panel, '.np-error').hidden = true
      state.dirty = false
      state.pendingDraft = null
      state.pendingFileId = null
      void loadSnapshot(state.db).then(snapshot => {
        state.nodes = snapshot.nodes
        state.renderCache.clear()
        render()
      }).catch(showError)
    }
    if (action === 'image') must(panel, '.np-file').click()
    /* Lint badge click: jump the source caret to the reported offset. */
    if (target.classList.contains('np-lint') && target.dataset.pos !== '') {
      const pos = Number(target.dataset.pos)
      if (Number.isFinite(pos)) {
        write().focus()
        write().setSelectionRange(pos, pos)
      }
      return
    }
    /* JSON tool cluster: tree fold controls run only in the tree view; the
       text tools rewrite the source and mark it dirty via scheduleSave. */
    const jsonOp = target.dataset.json
    if (jsonOp && isJson() && state.db) {
      const file = current()
      if (!file) return
      const source = write()
      const collapsed = jsonCollapsedFor(file.id)
      if (jsonOp === 'expand') {
        collapsed.clear()
        state.view = 'rendered'
        render()
      } else if (jsonOp === 'collapse') {
        const parsed = validateJson(source.value || file.draft || '')
        if (parsed.ok) {
          const collect = (v, path) => {
            if (v !== null && typeof v === 'object') {
              collapsed.add(path)
              const entries = Array.isArray(v) ? v.entries() : Object.entries(v)
              for (const [k, child] of entries) collect(child, `${path}/${String(k).replace(/~/g, '~0').replace(/\//g, '~1')}`)
            }
          }
          collect(parsed.value, '')
        }
        state.view = 'rendered'
        render()
      } else {
        const helpers = { format: formatJson, minify: minifyJson, escape: escapeJson, unescape: unescapeJson, strip: decodeEscapes }
        const next = helpers[jsonOp]?.(source.value)
        if (typeof next === 'string' && next !== source.value) {
          source.value = next
          scheduleSave()
        }
        state.view = 'source'
        render()
        write().focus()
      }
      return
    }
    const format = target.dataset.format
    if (format) {
      const source = write()
      const applied = applyFormat(source.value, source.selectionStart, source.selectionEnd, format)
      source.value = applied.text
      source.setSelectionRange(applied.cursor, applied.cursor)
      scheduleSave()
    }
    if (target.dataset.close) {
      if (state.ui.currentId === target.dataset.close) flushSave()
      state.ui.tabs = state.ui.tabs.filter(id => id !== target.dataset.close)
      if (state.ui.currentId === target.dataset.close) state.ui.currentId = state.ui.tabs.at(-1) ?? null
      render(); void persistUi()
    } else if (target.dataset.tab) {
      openFile(target.dataset.tab)
    }
    if (target.dataset.ws !== undefined) {
      flushSave()
      state.ui.workspaceChoice = target.dataset.ws === '' ? 'unassigned' : target.dataset.ws
      state.ui.currentId = null
      render()
      void persistUi()
      return
    }
    const row = target.closest('[data-id]')
    const id = row?.dataset.id
    if (id) {
      const node = state.nodes.find(item => item.id === id)
      if (node?.kind === 'file') openFile(id)
      else { state.ui.currentId = id; render() }
    }
  })
  /* Keep per-file JSON fold state in sync: toggling a <details> updates the
     file's collapsed path set, so re-renders preserve the user's folds. */
  on(panel, 'toggle', event => {
    const details = event.target instanceof HTMLElement ? event.target.closest('details[data-nj-path]') : null
    if (!details || !isJson()) return
    const file = current()
    if (!file) return
    const collapsed = jsonCollapsedFor(file.id)
    if (details.open) collapsed.delete(details.dataset.njPath)
    else collapsed.add(details.dataset.njPath)
  })
  panel.addEventListener('keydown', event => {
    if ((event.key !== 'Enter' && event.key !== ' ') || dialogOpen) return
    const node = event.target instanceof Element ? event.target.closest('[data-ws]') : null
    if (node) { event.preventDefault(); node.click() }
  })

  const slashMenu = must(panel, '.np-slash')

  function slashQuery() {
    const source = write()
    const before = source.value.slice(0, source.selectionStart)
    const match = /(?:^|\n)\/([^\n/]*)$/.exec(before)
    if (!match) return null
    return { start: source.selectionStart - match[1].length - 1, query: match[1].toLowerCase() }
  }

  function slashItems() {
    const query = state.slash?.query ?? ''
    return FORMAT_DEFS.filter(def => {
      const label = formatLabel(def.kind).toLowerCase()
      return query === '' || label.includes(query) || def.kind.includes(query)
    })
  }

  function paintSlash() {
    const items = slashItems()
    state.slashIndex = clamp(state.slashIndex, 0, Math.max(0, items.length - 1))
    slashMenu.innerHTML = items.length === 0
      ? `<p class="np-slash-empty">${escapeHtml(text().noMatches)}</p>`
      : items.map((def, index) => `<button type="button" class="nano-menu-item" data-slash="${def.kind}" data-active="${index === state.slashIndex}"><span class="nano-menu-icon" aria-hidden="true">${def.icon}</span><span class="nano-menu-label">${escapeHtml(formatLabel(def.kind))}</span></button>`).join('')
    slashMenu.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }

  function placeSlash() {
    const source = write()
    const rect = caretRect(source, source.selectionStart)
    const editor = must(panel, '.np-editor')
    const top = source.offsetTop + rect.top - source.scrollTop + rect.height + 4
    const left = clamp(rect.left, 8, Math.max(8, editor.clientWidth - 236))
    slashMenu.style.left = `${left}px`
    const below = top + 260 > editor.clientHeight
    slashMenu.style.top = below ? `${Math.max(4, source.offsetTop + rect.top - source.scrollTop - 264)}px` : `${top}px`
    slashMenu.style.bottom = 'auto'
  }

  function closeSlash() {
    state.slash = null
    state.slashIndex = 0
    slashMenu.hidden = true
  }

  function refreshSlash() {
    const query = slashQuery()
    if (!query) { closeSlash(); return }
    state.slash = query
    state.slashIndex = clamp(state.slashIndex, 0, 100)
    paintSlash()
    placeSlash()
    if (slashMenu.hidden) { slashMenu.classList.remove('np-pop-in'); void slashMenu.offsetWidth; slashMenu.classList.add('np-pop-in') }
    slashMenu.hidden = false
  }

  write().addEventListener('focus', () => {
    if (!current() && state.db) void beginWriting()
  })
  write().addEventListener('input', () => {
    if (!current() && state.db) {
      const typed = write().value
      void beginWriting().then(() => {
        if (typed && write().value !== typed) {
          write().value = typed
          scheduleSave()
          paintMirror()
        }
      })
      return
    }
    refreshSlash()
    scheduleSave()
    paintMirror()
    /* Live-lint JSON files so the badge tracks what is being typed. */
    if (isJson()) {
      const lint = panel.querySelector('.np-lint')
      if (lint instanceof HTMLElement) {
        const source = write()
        const result = validateJson(source.value)
        lint.dataset.state = result.ok ? 'ok' : 'err'
        lint.dataset.pos = result.ok ? '' : String(result.pos)
        const { line, col } = result.ok ? { line: 0, col: 0 } : positionOf(source.value, result.pos)
        lint.textContent = result.ok ? text().jsonOk : `${text().jsonErr} ${line}:${col}`
        lint.title = result.ok ? '' : String(result.message)
      }
    }
  })
  write().addEventListener('scroll', () => {
    if (state.slash) placeSlash()
    fitMirror()
  })
  if (typeof ResizeObserver === 'function') {
    const mirrorBox = new ResizeObserver(() => fitMirror())
    mirrorBox.observe(write())
    disposers.push(() => mirrorBox.disconnect())
  }

  function insertSlash(kind) {
    const source = write()
    const start = state.slash?.start ?? source.selectionStart - 1
    source.setRangeText('', start, source.selectionStart)
    closeSlash()
    scheduleSave()
    if (kind === 'image') {
      must(panel, '.np-file').click()
      return
    }
    const applied = applyFormat(source.value, source.selectionStart, source.selectionStart, kind)
    source.value = applied.text
    source.setSelectionRange(applied.cursor, applied.cursor)
    scheduleSave()
  }

  write().addEventListener('keydown', event => {
    const mod = event.metaKey || event.ctrlKey
    if (mod && !state.slash) {
      const map = { b: 'bold', i: 'italic', k: 'link' }
      const kind = event.shiftKey && (event.key === 'x' || event.key === 'X') ? 'strike' : map[event.key?.toLowerCase()]
      if (kind) {
        event.preventDefault()
        const source = write()
        const applied = applyFormat(source.value, source.selectionStart, source.selectionEnd, kind)
        source.value = applied.text
        source.setSelectionRange(applied.cursor, applied.cursor)
        scheduleSave()
        return
      }
      if (event.key?.toLowerCase() === 's') {
        event.preventDefault()
        void commit('manual').catch(showError)
        return
      }
    }
    if (!state.slash) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSlash()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const items = slashItems()
      if (items.length === 0) return
      event.preventDefault()
      state.slashIndex = (state.slashIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      paintSlash()
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      const items = slashItems()
      if (items.length === 0) return
      event.preventDefault()
      insertSlash(items[state.slashIndex]?.kind ?? 'bullet')
    }
  })
  slashMenu.addEventListener('pointerdown', event => event.preventDefault())
  slashMenu.addEventListener('click', event => {
    const kind = event.target instanceof HTMLElement ? event.target.closest('[data-slash]')?.dataset.slash : undefined
    if (kind) insertSlash(kind)
  })
  /* Preview is read-only for the mouse: clicking inside it selects text or
     follows links; returning to the source is the view switch's job alone. */
  const readPane = must(panel, '.np-read')
  readPane.addEventListener('scroll', () => touchPosition())
  write().addEventListener('scroll', () => touchPosition())
  write().addEventListener('select', () => touchPosition())
  write().addEventListener('click', () => touchPosition())
  panel.addEventListener('click', event => {
    if (!(event.target instanceof HTMLElement) || event.target.closest('.np-slash')) return
    if (state.slash && event.target !== write()) closeSlash()
  })
  must(panel, '.np-file').addEventListener('change', event => {
    const input = /** @type {HTMLInputElement} */ (event.target)
    const file = input.files?.[0]
    input.value = ''
    if (!file || !state.db) return
    void storeImage(state.db, file, state.settings.imageLimitBytes).then(image => {
      state.imageEpoch += 1
      const source = write()
      source.setRangeText(`![${file.name}](notepad-image:${image.id})`, source.selectionStart, source.selectionEnd, 'end')
      state.view = 'rendered'
      scheduleSave()
      void renderBody()
    }).catch(showError)
  })
  function insertStoredImage(file) {
    if (!state.db) return
    void storeImage(state.db, file, state.settings.imageLimitBytes).then(image => {
      state.imageEpoch += 1
      const source = write()
      source.setRangeText(`![${file.name || 'image'}](notepad-image:${image.id})`, source.selectionStart, source.selectionEnd, 'end')
      state.view = 'rendered'
      scheduleSave()
      void renderBody()
    }).catch(showError)
  }
  panel.addEventListener('dragover', event => {
    if ([...(event.dataTransfer?.files ?? [])].some(file => file.type.startsWith('image/'))) event.preventDefault()
  })
  panel.addEventListener('drop', event => {
    if (dialogOpen) return
    const image = [...(event.dataTransfer?.files ?? [])].find(file => file.type.startsWith('image/'))
    if (!image) return
    event.preventDefault()
    event.stopPropagation()
    insertStoredImage(image)
  })
  panel.addEventListener('paste', event => {
    if (dialogOpen) return
    if (event.target !== write()) return
    const image = [...(event.clipboardData?.files ?? [])].find(file => file.type.startsWith('image/'))
    if (!image || !state.db) return
    event.preventDefault()
    void storeImage(state.db, image, state.settings.imageLimitBytes).then(stored => {
      state.imageEpoch += 1
      const source = write()
      source.setRangeText(`![image](notepad-image:${stored.id})`, source.selectionStart, source.selectionEnd, 'end')
      state.view = 'rendered'
      scheduleSave()
      void renderBody()
    }).catch(showError)
  })

  on(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') void commit('interval').catch(showError)
  })
  let resizeFrame = 0
  on(window, 'resize', () => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => render())
  })
  on(document, 'keydown', event => {
    if (event.key === 'Escape' && closeMenu) {
      event.stopPropagation()
      event.preventDefault()
      closeMenu()
    }
  }, true)

  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  if (channel) {
    const onMessage = event => {
      if (state.dirty && event.data?.fileId === state.ui.currentId) {
        showError(new Error(text().otherTab), true)
        return
      }
      if (state.db) void loadSnapshot(state.db).then(snapshot => {
        state.nodes = snapshot.nodes
        state.settings = { ...defaults, ...snapshot.settings }
        state.renderCache.clear()
        render()
      })
    }
    channel.addEventListener('message', onMessage)
    disposers.push(() => channel.close())
  }

  const stop = appTheme.subscribe(() => render())
  const stopThemeInner = typeof stop === 'function' ? stop : () => {}
  const languageStop = language.subscribe(() => render())
  const stopLanguage = typeof languageStop === 'function' ? languageStop : () => {}
  const workspaceStop = workspaces.subscribe(() => render())
  const stopWorkspaces = typeof workspaceStop === 'function' ? workspaceStop : () => {}

  const api = {
    stopTheme() {
      stopThemeInner()
      stopLanguage()
      stopWorkspaces()
      window.clearTimeout(state.saveTimer)
      window.clearInterval(state.commitTimer)
      flushSave()
      for (const dispose of disposers) dispose()
    },
    toggle() {
      const opening = !state.ui.open
      if (opening) focusSessionWorkspace()
      else dismissOverlays()
      state.ui.open = opening
      render()
      void persistUi()
    },
    setShortcut(label, keys) {
      entry.title = label
      entry.setAttribute('aria-label', label)
      if (keys) entry.setAttribute('aria-keyshortcuts', keys)
      tip.textContent = label
    },
    failed(error) {
      state.db = null
      write().disabled = true
      showError(error)
    },
  }
  entry.addEventListener('pointerenter', () => { tip.hidden = false })
  entry.addEventListener('pointerleave', () => { tip.hidden = true })

  /* Cross-plugin import surface: other bundles (explorer-extra) hand a file over as a
     * fresh top-level note without touching the source on disk. The import lands as a
     * draft, so edits stay local until "save as" picks a real target. */
  const dbReady = new Promise((resolve, reject) => { state.dbReadyResolve = resolve; state.dbReadyReject = reject })
  window.__nanoNotepad = {
    async import(name, content, meta = {}) {
      await dbReady
      const siblings = state.nodes.filter(node => node.parentId === null && (node.workspaceId ?? null) === activeWorkspace().id && node.kind === 'file')
      const raw = String(name || 'note').trim() || 'note'
      const hasExt = /\.(md|markdown|json)$/i.test(raw)
      const base = raw.replace(/\.(md|markdown|json)$/i, '') || 'note'
      const ext = hasExt ? raw.match(/\.(md|markdown|json)$/i)[0] : '.md'
      let candidate = `${base}${ext}`, i = 1
      while (siblings.some(s => s.name === candidate)) candidate = `${base}-${++i}${ext}`
      const node = await createNode(state.db, 'file', null, candidate, activeWorkspace().id)
      if (typeof meta.sourcePath === 'string' && meta.sourcePath) node.sourcePath = meta.sourcePath
      state.nodes.push(node)
      await saveDraft(state.db, node.id, String(content ?? ''))
      if (node.sourcePath !== undefined) await updateNodeMeta(state.db, node.id, { sourcePath: node.sourcePath })
      node.draft = String(content ?? '')
      openFile(node.id)
      /* openFile renders before node.draft lands; repaint both views once the
         draft exists so the source textarea and mirror show the import. */
      render()
      channel?.postMessage({ type: 'changed' })
      return node
    },
  }

  /** Chat cards named `[data-changed-files]` are one turn's edited files. */
  async function copyChangedMarkdown(path, button) {
    button.disabled = true
    const response = await fetch('/nano-notepad/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    const out = await response.json().catch(() => ({}))
    if (!response.ok || out.ok !== true) throw new Error(out.message || 'read failed')
    const workspaceId = workspaceCatalog().currentId
    state.ui.workspaceChoice = workspaceId ?? 'unassigned'
    state.ui.open = true
    await window.__nanoNotepad.import(out.name, out.content, { sourcePath: path })
    button.textContent = text().copiedToNotepad
  }

  function attachNotepadCtas(root) {
    const cards = []
    if (root instanceof Element) {
      if (root.matches('[data-changed-files]')) cards.push(root)
      cards.push(...root.querySelectorAll('[data-changed-files]'))
      const host = root.closest('[data-changed-files]')
      if (host instanceof HTMLElement && !cards.includes(host)) cards.push(host)
    }
    for (const card of cards) {
      if (!(card instanceof HTMLElement) || card.querySelector(':scope > .np-to-notepad')) continue
      if (card.getAttribute('data-single') === null) continue
      const path = card.querySelector('span[hidden]')?.textContent?.trim() ?? ''
      if (!/\.(md|markdown)$/i.test(path)) continue
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'np-to-notepad'
      button.textContent = text().copyToNotepad
      button.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        void copyChangedMarkdown(path, button).catch(error => {
          button.disabled = false
          button.textContent = text().copyToNotepad
          showError(error)
        })
      })
      card.append(button)
    }
    for (const card of cards) {
      if (!(card instanceof HTMLElement) || card.getAttribute('data-single') !== null) continue
      for (const row of card.querySelectorAll('li')) {
        if (!(row instanceof HTMLElement) || row.querySelector(':scope > .np-change-action')) continue
        const path = row.querySelector('span[hidden]')?.textContent?.trim() ?? ''
        const shown = row.querySelector('button span')?.textContent?.trim() ?? ''
        if (!path && !shown) continue
        const markdown = /\.(md|markdown)$/i.test(path || shown)
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'np-change-action'
        button.textContent = markdown ? text().copyChange : text().previewChange
        const stop = event => { event.preventDefault(); event.stopPropagation() }
        button.addEventListener('pointerdown', stop)
        button.addEventListener('click', event => {
          stop(event)
          if (!markdown) {
            const target = shown && !shown.startsWith('/') ? shown : path
            try {
              if (previewFile(target) === false) showError(new Error(text().previewFailed), false, true)
            } catch (error) {
              showError(error, false, true)
            }
            return
          }
          void copyChangedMarkdown(path, button).catch(error => {
            button.disabled = false
            button.textContent = text().copyChange
            showError(error)
          })
        })
        row.append(button)
      }
    }
  }

  attachNotepadCtas(document)
  const ctaWatch = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) attachNotepadCtas(node)
      }
    }
  })
  ctaWatch.observe(document.body, { childList: true, subtree: true })
  disposers.push(() => ctaWatch.disconnect())

  void openDatabase().then(async db => {
    state.db = db
    const snapshot = await loadSnapshot(db)
    state.nodes = snapshot.nodes
    state.settings = { ...defaults, ...snapshot.settings }
    state.ui = { ...state.ui, ...snapshot.ui, tabs: snapshot.ui.tabs ?? [] }
    state.settings = normalizeSettings(state.settings)
    state.view = state.settings.defaultView
    if (!state.nodes.some(node => node.kind === 'file')) {
      const node = await createNode(state.db, 'file', null, 'untitled.md', activeWorkspace().id)
      state.nodes.push(node)
      state.ui.tabs = [node.id]
      state.ui.currentId = node.id
      state.view = 'source'
      await writeUi(state.db, state.ui)
    }
    armCommit()
    render()
    void navigator.storage?.persist?.()
    state.dbReadyResolve?.()
  }).catch(error => { state.dbReadyReject?.(error); api.failed(error) })
  render()
  return api
}
