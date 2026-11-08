/** Floating notepad panel. Persistence lives in db.js; this file draws and routes gestures. */

import {
  CHANNEL,
  clearContent,
  commitVersion,
  counts,
  createNode,
  deleteNode,
  imageIdsIn,
  imagesById,
  loadSnapshot,
  moveNode,
  nextUntitled,
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
import { applyFormat, renderMarkdown } from './markdown.js'
import { copyFor } from './i18n.js'

const STYLE = `
[data-nano-notepad] { pointer-events: none; }
.np-layer { position: fixed; inset: 0; pointer-events: none; z-index: 30; color: var(--dsw-alias-label-primary); font-family: var(--dsw-font-family); font-size: 13px; }
.np-entry, .np-window, .np-slash { pointer-events: auto; }
.np-entry, .np-window { position: absolute; }
.np-entry { z-index: 3; }
.np-window { z-index: 2; }
.np-dialog[hidden], .np-slash[hidden], .np-window[hidden], .np-read[hidden], .np-error[hidden] { display: none !important; }
.np-entry { width: 36px; height: 36px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); cursor: grab; box-shadow: var(--dsw-elevation-soft); }
.np-entry:active { cursor: grabbing; }
.np-entry svg { width: 18px; height: 18px; display: block; margin: auto; }
.np-tip { position: absolute; right: 44px; top: 2px; white-space: nowrap; background: var(--dsw-alias-tooltip-bg); color: var(--dsw-alias-tooltip-label, var(--dsw-alias-label-primary-foreground)); border-radius: var(--dsw-radius-sm); padding: 4px 8px; }
.np-window { width: min(920px, calc(100vw - 48px)); height: min(640px, calc(100vh - 48px)); min-width: 320px; min-height: 240px; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-panel, 16px); box-shadow: var(--dsw-elevation-prominent); overflow: hidden; }
.np-resize { position: absolute; z-index: 6; pointer-events: auto; }
.np-resize[data-edge="n"], .np-resize[data-edge="s"] { left: 14px; right: 14px; height: 8px; cursor: ns-resize; }
.np-resize[data-edge="n"] { top: -4px; }
.np-resize[data-edge="s"] { bottom: -4px; }
.np-resize[data-edge="e"], .np-resize[data-edge="w"] { top: 14px; bottom: 14px; width: 8px; cursor: ew-resize; }
.np-resize[data-edge="e"] { right: -4px; }
.np-resize[data-edge="w"] { left: -4px; }
.np-resize[data-edge="nw"], .np-resize[data-edge="ne"], .np-resize[data-edge="sw"], .np-resize[data-edge="se"] { width: 14px; height: 14px; }
.np-resize[data-edge="nw"] { top: -4px; left: -4px; cursor: nwse-resize; }
.np-resize[data-edge="se"] { right: -4px; bottom: -4px; cursor: nwse-resize; }
.np-resize[data-edge="ne"] { top: -4px; right: -4px; cursor: nesw-resize; }
.np-resize[data-edge="sw"] { left: -4px; bottom: -4px; cursor: nesw-resize; }
.np-body, .np-editor { min-width: 0; overflow: hidden; }
.np-read, .np-write { overflow: auto; }
.np-nodes { overflow-x: hidden; overflow-y: auto; }
.np-tabs { display: flex; align-items: center; gap: 4px; min-height: 40px; padding: 6px 12px; cursor: grab; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.np-tablist { display: flex; min-width: 0; gap: 2px; }
.np-tab { border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); padding: 4px 8px; }
.np-tab[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.np-body { display: flex; min-height: 0; flex: 1; }
.np-tree { box-sizing: border-box; width: 248px; display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--dsw-alias-border-l2); background: transparent; }
.np-tree[data-collapsed="true"] { width: 53px; align-items: stretch; }
.np-tree[data-collapsed="true"] .np-workspace, .np-tree[data-collapsed="true"] .np-tree-tools, .np-tree[data-collapsed="true"] .np-tree-head > span, .np-tree[data-collapsed="true"] .np-nodes { display: none; }
.np-tree[data-collapsed="true"] .np-tree-head { width: 100%; justify-content: center; padding: 0 12px; }
.np-tree-head { box-sizing: border-box; display: flex; align-items: center; gap: 4px; width: 100%; height: 40px; padding: 0 12px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.np-tree-toggle { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; padding: 0; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); }
.np-tree-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-tree-tools { display: flex; align-items: center; gap: 2px; }
.np-tree-tools button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); }
.np-tree-tools button svg { width: 16px; height: 16px; display: block; }
.np-tree-tools button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.np-nodes { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 0 12px 12px; }
.np-tree-foot { display: flex; align-items: center; gap: 8px; flex: none; padding: 8px 12px 12px; border-top: 1px solid var(--dsw-alias-border-l2); }
.np-tree-foot button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; }
.np-tree-foot svg { width: 16px; height: 16px; display: block; }
.np-tree[data-collapsed="true"] .np-tree-foot { flex-direction: column; margin-top: auto; padding: 8px 0 12px; border-top: 0; }
.np-tree[data-collapsed="true"] .np-tree-foot span { display: none; }
.np-tree[data-collapsed="true"] .np-tree-foot button { width: 28px; height: 28px; padding: 0; }
.np-node { position: relative; box-sizing: border-box; display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; height: 28px; margin: 0; padding-right: 8px; border: 0 !important; background: transparent !important; box-shadow: none; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); text-align: left; font-weight: 400; overflow: hidden; }
.np-node:hover { background: var(--dsw-alias-interactive-bg-hover) !important; color: var(--dsw-alias-label-primary); }
.np-node[data-active="true"] { background: var(--dsw-alias-interactive-bg-active) !important; color: var(--dsw-alias-label-primary); }
.np-node-main { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; border: 0; background: transparent; color: inherit; padding: 0; text-align: left; overflow: hidden; }
.np-node:hover .np-node-main, .np-node:focus-within .np-node-main { padding-right: 70px; }
.np-node-actions { position: absolute; right: 4px; top: 0; height: 100%; display: none; align-items: center; gap: 2px; }
.np-node:hover .np-node-actions, .np-node:focus-within .np-node-actions { display: flex; }
.np-node-actions button { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; border: 0 !important; background: transparent !important; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-xs, 4px); }
.np-node-actions button[data-active="true"] { color: var(--dsw-alias-brand-primary); }
.np-node-actions button:hover { background: var(--dsw-alias-bg-layer-1) !important; color: var(--dsw-alias-label-primary); }
.np-caret { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--dsw-alias-label-tertiary); padding: 0; }
.np-caret[data-open="false"] svg { transform: rotate(-90deg); }
.np-node-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; color: var(--dsw-alias-label-tertiary); }
.np-node-name { display: block; min-width: 0; overflow: hidden; white-space: nowrap; -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 18px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 18px), transparent); }
.np-entry svg, .np-node-icon svg, .np-tree-tools svg, .np-tree-toggle svg, .np-tree-foot svg, .np-caret svg, .np-node-actions svg { fill: currentColor; stroke: none; }
.np-node-icon svg, .np-tree-tools svg, .np-tree-toggle svg, .np-caret svg, .np-node-actions svg { width: 16px; height: 16px; display: block; }
.np-workspace { max-width: 132px; border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; }
.np-group { margin: 8px 0 2px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 20px; }
.np-group[data-active="true"] { color: var(--dsw-alias-label-primary); }
.np-editor { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
.np-path, .np-toolbar, .np-footer { min-width: 0; }
.np-path, .np-toolbar { display: flex; gap: 8px; align-items: center; padding: 6px 12px; }
.np-path { color: var(--dsw-alias-label-tertiary); font-family: var(--dsw-font-markdown-code-font-family); font-size: 12px; }
.np-path span:not(.np-modes) { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-modes, .np-path > button { flex: 0 0 auto; white-space: nowrap; }
.np-modes { display: inline-flex; align-items: center; gap: 4px; }
.np-modes button { height: 30px; padding: 0 10px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.np-modes button[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.np-path > button[data-action="rename"] { flex: 0 0 auto; height: 30px; min-width: max-content; }
.np-toolbar { flex-wrap: wrap; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.np-window button:not(.np-node-main):not(.np-caret):not(.np-tree-tools button):not(.np-tree-toggle):not(.np-node-actions button), .np-card button, .np-slash button { border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: var(--dsw-radius-sm); padding: 4px 10px; cursor: pointer; font: inherit; line-height: 20px; }
.np-tree[data-collapsed="true"] .np-tree-foot button { padding: 0; }
.np-node-main, .np-caret { border: 0 !important; background: transparent !important; box-shadow: none; }
.np-window button:hover, .np-card button:hover, .np-slash button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.np-tabs > button, .np-tab { background: transparent; }
.np-danger { color: var(--dsw-alias-label-error); border-color: var(--dsw-alias-state-error-primary); }
.np-write, .np-read { flex: 1; min-height: 0; margin: 0; }
.np-write { box-sizing: border-box; width: 100%; max-width: 100%; resize: none; border: 0; outline: 0; background: transparent; color: var(--dsw-alias-label-primary); caret-color: var(--dsw-alias-label-primary); padding: 12px; font: var(--dsw-font-markdown-code); overflow-wrap: anywhere; }
.np-write:disabled { color: var(--dsw-alias-label-tertiary); }
.np-read { box-sizing: border-box; max-width: 100%; overflow: auto; overflow-wrap: anywhere; padding: 12px; color: var(--dsw-alias-label-primary); cursor: text; }
.np-read img { display: block; max-width: min(100%, 640px); margin: 8px 0; border-radius: var(--dsw-radius-md); }
.np-read .missing-image { border: 1px dashed var(--dsw-alias-border-l3); padding: 2px 4px; }
.np-dialog { position: absolute; inset: 0; z-index: 20; border-radius: inherit; background: var(--dsw-alias-bg-mask-1); display: flex; align-items: center; justify-content: center; padding: 16px; pointer-events: auto; }
.np-slash { background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-3)); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); box-shadow: var(--dsw-elevation-prominent); backdrop-filter: var(--dsw-menu-backdrop-filter); }
.np-card { box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; width: min(560px, calc(100% - 32px)); max-height: calc(100% - 32px); padding: 22px 24px 24px; overflow: auto; border: 0; border-radius: var(--dsw-radius-panel, 16px); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); box-shadow: var(--dsw-elevation-prominent); }
.np-card h3 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
.np-card p, .np-card pre { margin: 0; color: var(--dsw-alias-label-secondary); line-height: 22px; }
.np-card pre { max-height: 240px; overflow: auto; white-space: pre-wrap; font-family: var(--dsw-font-markdown-code-font-family); }
.np-card label { display: flex; flex-direction: column; align-items: stretch; gap: 6px; margin: 0; color: var(--dsw-alias-label-secondary); }
.np-card input, .np-card select { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); padding: 8px 10px; font: inherit; }
.np-card input:focus, .np-card select:focus { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); }
.np-actions { display: flex; justify-content: flex-end; gap: 8px; margin: 0; }
.np-actions button[data-go="ok"], .np-actions button[data-go="confirm"], .np-actions button[data-go="restore"] { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); border-color: transparent; }
.np-versions { max-height: 240px; overflow: auto; display: flex; flex-direction: column; }
.np-error { color: var(--dsw-alias-label-error); padding: 0 12px 8px; }
.np-slash { position: absolute; left: 16px; bottom: 52px; padding: 6px; display: grid; grid-template-columns: repeat(4, max-content); gap: 4px; z-index: 4; }
.np-footer { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 12px; border-top: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
@media (max-width: 760px) {
  .np-window { inset: 12px auto auto 12px; width: calc(100% - 24px); height: min(82dvh, calc(100% - 24px)); }
  .np-body { flex-direction: column; }
  .np-tree { width: auto; max-height: 34%; border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
  .np-tree[data-collapsed="true"] { width: 53px; max-height: none; }
  .np-footer { flex-direction: column; align-items: stretch; }
  .np-footer-actions { justify-content: flex-start; }
  .np-footer-actions button { min-height: 36px; }
  .np-tabs { flex-wrap: wrap; }
  .np-card { padding: 18px 16px 24px; }
}
.np-sync { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.np-beat { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--dsw-alias-label-tertiary); }
.np-beat[data-state="saved"], .np-beat[data-state="committed"] { background: var(--dsw-alias-state-success-primary); }
.np-beat[data-state="dirty"] { background: var(--dsw-alias-state-warn-primary); }
.np-beat[data-state="saving"] { background: var(--dsw-alias-brand-primary); animation: np-pulse 1s ease-in-out infinite; }
.np-beat[data-state="error"] { background: var(--dsw-alias-state-error-primary); }
@keyframes np-pulse { 50% { opacity: .25; } }
.np-footer-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
.np-section { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--dsw-alias-border-l2); }
.np-section h4 { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-tertiary); }

`

const FORMAT_KINDS = ['paragraph', 'h1', 'h2', 'h3', 'bold', 'italic', 'strike', 'bullet', 'numbered', 'task', 'quote', 'link']

const googleIcon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`
const FILE_ICON = googleIcon('M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z')
const FOLDER_ICON = googleIcon('M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8z')
const PLUS_ICON = googleIcon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z')
const FOLDER_PLUS_ICON = googleIcon('M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2m-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3z')
const CLOSE_ICON = googleIcon('M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z')
const SETTINGS_ICON = googleIcon('M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z')
const PIN_ICON = googleIcon('M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3')
const EDIT_ICON = googleIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75z')
const CHEVRON_ICON = googleIcon('M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z')
const CHEVRON_LEFT = googleIcon('M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z')
const CHEVRON_RIGHT = googleIcon('M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z')
const ICON = FILE_ICON

/** @param {ParentNode} root @param {string} selector */
function must(root, selector) {
  const node = root.querySelector(selector)
  if (!(node instanceof HTMLElement)) throw new Error(`notepad missing ${selector}`)
  return node
}

export function mountNotepad(host, defaults, appTheme = { scheme: () => 'dark', subscribe: () => () => {} }, language = { current: () => 'en', subscribe: () => () => {} }, workspaces = { current: () => ({ items: [], currentId: null }), subscribe: () => () => {} }) {
  host.innerHTML = `<div class="np-layer"><button class="np-entry" type="button">${ICON}<span class="np-tip" hidden></span></button><section class="np-window" hidden></section></div>`
  const layer = must(host, '.np-layer')
  const entry = must(host, '.np-entry')
  const tip = must(host, '.np-tip')
  const panel = must(host, '.np-window')
  panel.innerHTML = `
    <div class="np-tabs"><div class="np-tablist"></div><button type="button" data-action="new-file" data-i18n="newFile" data-i18n-mode="title">+</button></div>
    <div class="np-body">
      <aside class="np-tree"><div class="np-tree-head"><button type="button" class="np-tree-toggle" data-action="toggle-tree"></button><select class="np-workspace" aria-label="Workspace"></select><span style="flex:1"></span><span class="np-tree-tools"><button type="button" data-action="new-file" data-i18n="newFile" data-i18n-mode="title">${PLUS_ICON}</button><button type="button" data-action="new-folder" data-i18n="newFolder" data-i18n-mode="title">${FOLDER_PLUS_ICON}</button><button type="button" class="np-danger" data-action="delete" data-i18n="delete" data-i18n-mode="title">${CLOSE_ICON}</button></span></div><div class="np-nodes" data-root="true"></div><div class="np-tree-foot"><button type="button" data-action="settings" data-i18n="settings" data-i18n-mode="label">${SETTINGS_ICON}<span data-i18n="settings"></span></button><button type="button" data-action="close" data-i18n="close" data-i18n-mode="label">${CLOSE_ICON}<span data-i18n="close"></span></button></div></aside>
      <div class="np-editor">
        <div class="np-path"><span class="np-pathname"></span><span class="np-modes" role="group"><button type="button" data-action="view" data-view="source" data-i18n="source"></button><button type="button" data-action="view" data-view="rendered" data-i18n="preview"></button></span><button type="button" data-action="rename" data-i18n="rename"></button></div>
        <div class="np-toolbar">${FORMAT_KINDS.map(kind => `<button type="button" data-format="${kind}" data-format-kind="${kind}"></button>`).join('')}<button type="button" data-action="image" data-i18n="image"></button></div>
        <textarea class="np-write" placeholder="Write markdown... Type / for blocks."></textarea>
        <div class="np-slash" hidden></div>
        <div class="np-read" hidden></div>
        <div class="np-error" hidden></div>
        <footer class="np-footer"><span class="np-sync"><i class="np-beat" data-state="idle"></i><span class="np-status-text"></span></span><span class="np-footer-actions"><button type="button" data-action="copy" data-i18n="copyPath"></button><button type="button" data-action="history" data-i18n="history"></button><button type="button" data-action="save-version" data-i18n="saveVersion"></button><button type="button" class="np-danger" data-action="clear-file" data-i18n="clearFile"></button></span></footer>
      </div>
    </div>
    <div class="np-resize" data-edge="n"></div><div class="np-resize" data-edge="s"></div><div class="np-resize" data-edge="e"></div><div class="np-resize" data-edge="w"></div><div class="np-resize" data-edge="nw"></div><div class="np-resize" data-edge="ne"></div><div class="np-resize" data-edge="sw"></div><div class="np-resize" data-edge="se"></div>
    <div class="np-dialog" hidden><div class="np-card"></div></div>
    <input class="np-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
  `
  const dialogMask = must(panel, '.np-dialog')
  const style = document.createElement('style')
  style.textContent = STYLE
  host.append(style)

  const text = () => copyFor(language.current())

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
    for (const node of panel.querySelectorAll('[data-format-kind]')) {
      const kind = node.dataset.formatKind
      node.textContent = copy.formats[kind] ?? kind.toUpperCase()
    }
    panel.querySelector('.np-modes')?.setAttribute('aria-label', copy.viewGroup)
    write().placeholder = copy.placeholder
    paintStatus()
  }

  const state = {
    db: /** @type {IDBDatabase | null} */ (null),
    nodes: /** @type {any[]} */ ([]),
    settings: defaults,
    ui: { id: 'ui', open: false, tabs: /** @type {string[]} */ ([]), currentId: /** @type {string | null} */ (null), entryX: null, entryY: null, panelX: null, panelY: null },
    view: defaults.defaultView,
    slash: false,
    saveTimer: /** @type {number | undefined} */ (undefined),
    commitTimer: /** @type {number | undefined} */ (undefined),
    dirty: false,
    sync: { phase: 'idle', at: null, detail: '' },
    collapsed: new Set(),
  }

  const write = () => /** @type {HTMLTextAreaElement} */ (must(panel, '.np-write'))
  const current = () => state.nodes.find(node => node.id === state.ui.currentId && node.kind === 'file')

  function showError(error) {
    const node = must(panel, '.np-error')
    node.hidden = false
    const full = error?.name === 'QuotaExceededError'
    const message = full ? text().quota : (error instanceof Error ? error.message : String(error))
    node.textContent = message
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
    label.textContent = typeof value === 'function' ? value(state.sync.phase === 'error' ? state.sync.detail : time) : (value ?? status.idle)
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
    const maxWidth = Math.max(320, window.innerWidth - 16)
    const maxHeight = Math.max(240, window.innerHeight - 16)
    if (Number.isFinite(state.ui.panelW)) panel.style.width = `${clamp(state.ui.panelW, 320, maxWidth)}px`
    if (Number.isFinite(state.ui.panelH)) panel.style.height = `${clamp(state.ui.panelH, 240, maxHeight)}px`
  }

  function renderTree() {
    const box = must(panel, '.np-nodes')
    const lines = []
    const active = activeWorkspace()
    const visit = (parentId, depth, workspaceId) => {
      const nodes = state.nodes.filter(item => item.parentId === parentId && (item.workspaceId ?? null) === workspaceId)
      nodes.sort((a, b) => Number(b.pinned === true) - Number(a.pinned === true) || a.name.localeCompare(b.name))
      for (const node of nodes) {
        const icon = node.kind === 'folder' ? FOLDER_ICON : FILE_ICON
        const caret = node.kind === 'folder' ? `<button type="button" class="np-caret" data-caret="${node.id}" data-open="${!state.collapsed.has(node.id)}" aria-label="${text().collapse}">${CHEVRON_ICON}</button>` : ''
        const pinLabel = node.pinned === true ? text().unpin : text().pin
        const pin = node.kind === 'file' ? `<button type="button" data-pin="${node.id}" data-active="${node.pinned === true}" title="${pinLabel}" aria-label="${pinLabel}">${PIN_ICON}</button>` : ''
        lines.push(`<div class="np-node" data-kind="${node.kind}" data-active="${node.id === state.ui.currentId}" style="padding-left:${8 + depth * 16}px">${caret}<button class="np-node-main" type="button" draggable="true" data-id="${node.id}"><span class="np-node-icon" aria-hidden="true">${icon}</span><span class="np-node-name">${node.name}</span></button><span class="np-node-actions">${pin}<button type="button" data-rename="${node.id}" title="${text().rename}" aria-label="${text().rename}">${EDIT_ICON}</button><button type="button" class="np-danger" data-remove="${node.id}" title="${text().delete}" aria-label="${text().delete}">${CLOSE_ICON}</button></span></div>`)
        if (node.kind === 'folder' && !state.collapsed.has(node.id)) visit(node.id, depth + 1, workspaceId)
      }
    }
    const groups = active.mode === 'all'
      ? [...workspaceCatalog().items.map(item => item.workspaceId), null, ...new Set(state.nodes.map(node => node.workspaceId ?? null))]
      : [active.id]
    const seen = new Set()
    for (const workspaceId of groups) {
      const key = workspaceId ?? ''
      if (seen.has(key)) continue
      seen.add(key)
      if (active.mode === 'all') lines.push(`<div class="np-group" data-active="${workspaceId === workspaceCatalog().currentId}">${workspaceTitle(workspaceId)}</div>`)
      visit(null, 0, workspaceId)
    }
    box.innerHTML = lines.join('')
  }

  function renderTabs() {
    const box = must(panel, '.np-tablist')
    box.innerHTML = state.ui.tabs.map(id => {
      const node = state.nodes.find(item => item.id === id)
      if (!node) return ''
      return `<button class="np-tab" type="button" data-tab="${id}" data-active="${id === state.ui.currentId}">${node.name} <span data-close="${id}">×</span></button>`
    }).join('')
  }

  async function renderBody() {
    const file = current()
    must(panel, '.np-pathname').textContent = file ? pathOf(file.id) : text().noFile
    const source = write()
    const read = must(panel, '.np-read')
    if (!file) {
      source.value = ''
      source.disabled = state.db === null
      source.hidden = false
      read.hidden = true
      return
    }
    source.disabled = state.db === null
    if (document.activeElement !== source && !state.dirty) source.value = file.draft ?? ''
    if ((file.draft ?? '') === '' && !state.dirty) state.view = 'source'
    const rendered = state.view === 'rendered'
    source.hidden = rendered
    read.hidden = !rendered
    for (const button of panel.querySelectorAll('.np-modes button')) {
      button.dataset.active = String(button.dataset.view === state.view)
    }
    if (!rendered || state.db === null) return
    const markdown = source.value || file.draft || ''
    const images = await imagesById(state.db, imageIdsIn(markdown))
    read.innerHTML = markdown === ''
      ? `<p class="np-placeholder">${text().placeholder}</p>`
      : renderMarkdown(markdown, images)
  }

  function resolvedTheme() {
    if (state.settings.followApp === false && (state.settings.theme === 'light' || state.settings.theme === 'dark')) {
      return state.settings.theme
    }
    return appTheme.scheme() === 'light' ? 'light' : 'dark'
  }

  function paintWorkspaceChoices() {
    const select = panel.querySelector('.np-workspace')
    if (!(select instanceof HTMLSelectElement)) return
    const copy = text()
    const catalog = workspaceCatalog()
    const options = [
      ['current', copy.currentWorkspace],
      ['all', copy.allWorkspaces],
      ...catalog.items.map(item => [item.workspaceId, item.title || item.workspaceId]),
      ['unassigned', copy.unassigned],
    ]
    select.replaceChildren(...options.map(([value, label]) => {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      return option
    }))
    select.value = state.ui.workspaceChoice ?? 'all'
  }

  function render() {
    panel.hidden = !state.ui.open
    panel.dataset.theme = resolvedTheme()
    applyCopy()
    const tree = must(panel, '.np-tree')
    const treeCollapsed = state.ui.treeOpen === false
    tree.dataset.collapsed = String(treeCollapsed)
    const treeToggle = must(panel, '.np-tree-toggle')
    treeToggle.innerHTML = treeCollapsed ? CHEVRON_RIGHT : CHEVRON_LEFT
    treeToggle.title = treeCollapsed ? text().expandTree : text().collapseTree
    treeToggle.setAttribute('aria-label', treeToggle.title)
    paintWorkspaceChoices()
    renderTree()
    renderTabs()
    void renderBody()
    paintStatus()
    requestAnimationFrame(() => {
      applyWindowSize()
      place(entry, state.ui.entryX, state.ui.entryY, 72)
      place(panel, state.ui.panelX, state.ui.panelY, 80)
    })
  }

  async function persistUi() {
    if (state.db) await writeUi(state.db, state.ui)
  }

  function openFile(id) {
    if (!state.ui.tabs.includes(id)) state.ui.tabs.push(id)
    state.ui.currentId = id
    state.ui.open = true
    state.dirty = false
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
    state.slash = false
    must(panel, '.np-slash').hidden = true
    await renderBody()
    const source = write()
    source.hidden = false
    source.disabled = false
    source.focus()
  }

  function askName(title, initial, done) {
    const copy = text()
    dialog(`<h3>${title}</h3><input name="node-name" value="${initial.replace(/"/gu, '&quot;')}" aria-label="${title}"><div class="np-actions"><button type="button" data-go="cancel">${copy.cancel}</button><button type="button" data-go="ok">${copy.confirm}</button></div>`, (card, close) => {
      const input = card.querySelector('[name="node-name"]')
      input.focus()
      card.addEventListener('click', event => {
        const action = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (action === 'cancel') close()
        if (action === 'ok') {
          close()
          void done(input.value).catch(showError)
        }
      })
    })
  }

  function scheduleSave() {
    state.dirty = true
    setSync('dirty')
    window.clearTimeout(state.saveTimer)
    state.saveTimer = window.setTimeout(() => {
      const file = current()
      if (!file || !state.db) return
      const draft = write().value
      file.draft = draft
      setSync('saving')
      void saveDraft(state.db, file.id, draft).then(() => {
        state.dirty = false
        setSync('saved')
        channel?.postMessage({ type: 'changed', fileId: file.id })
      }).catch(showError)
    }, state.settings.saveDelayMs)
  }

  async function commit(reason) {
    const file = current()
    if (!file || !state.db) return null
    if (state.dirty) {
      file.draft = write().value
      await saveDraft(state.db, file.id, file.draft)
      state.dirty = false
    }
    const text = file.draft ?? ''
    if (text === '' && reason === 'interval') return null
    setSync('saving')
    const version = await commitVersion(state.db, file.id, text, reason, state.settings.versionLimit)
    setSync(version ? 'committed' : 'saved')
    return version
  }

  async function forget(id) {
    if (!state.db) return
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

  function dialog(html, setup) {
    const mask = dialogMask
    const card = document.createElement('div')
    card.className = 'np-card'
    must(mask, '.np-card').replaceWith(card)
    card.innerHTML = html
    mask.hidden = false
    setup(card, () => { mask.hidden = true })
  }

  function openSettings() {
    const values = state.settings
    const copy = text()
    dialog(`<h3>${copy.settingsTitle}</h3>
      <section class="np-section"><h4>${copy.saveHeading}</h4>
        <label>${copy.saveDelay}<input name="saveDelayMs" type="number" min="200" max="5000" value="${values.saveDelayMs}"></label>
        <label>${copy.commitInterval}<input name="commitIntervalSec" type="number" min="15" max="3600" value="${values.commitIntervalSec}"></label>
        <label>${copy.versionLimit}<input name="versionLimit" type="number" min="5" max="500" value="${values.versionLimit}"></label>
      </section>
      <section class="np-section"><h4>${copy.appearanceHeading}</h4>
        <label>${copy.openAs}<select name="defaultView"><option value="rendered">${copy.rendered}</option><option value="source">${copy.source}</option></select></label>
        <label>${copy.windowTheme}<select name="theme"><option value="dark">${copy.dark}</option><option value="light">${copy.light}</option><option value="system">${copy.followApp}</option></select></label>
      </section>
      <section class="np-section"><h4>${copy.imageHeading}</h4>
        <label>${copy.imageLimit}<input name="imageLimitBytes" type="number" min="262144" max="20971520" value="${values.imageLimitBytes}"></label>
        <p class="np-usage"></p>
      </section>
      <section class="np-section"><h4>${copy.positionHeading}</h4><div class="np-actions"><button type="button" data-go="reset-position">${copy.resetPosition}</button></div></section>
      <section class="np-section"><h4>${copy.dangerHeading}</h4><p>${copy.dangerBody}</p><div class="np-actions"><button type="button" class="np-danger" data-go="clear">${copy.clearAllTitle}</button></div></section>
      <div class="np-actions"><button type="button" data-go="close">${copy.close}</button></div>`, (card, close) => {
      card.querySelector('[name="defaultView"]').value = values.defaultView
      card.querySelector('[name="theme"]').value = values.theme
      if (state.db) void counts(state.db).then(async value => {
        const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : {}
        must(card, '.np-usage').textContent = text().usage(value.files, value.versions, value.images, estimate.usage ?? text().unknown)
      })
      card.addEventListener('click', event => {
        const action = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (action === 'close') close()
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
        if (action === 'clear') confirmClear(close)
      })
      const settingNames = ['saveDelayMs', 'commitIntervalSec', 'versionLimit', 'imageLimitBytes', 'defaultView', 'theme']
      card.addEventListener('change', () => {
        const merged = { ...state.settings }
        let rejected = false
        for (const input of card.querySelectorAll('input, select')) {
          if (!settingNames.includes(input.name)) continue
          const value = input.type === 'number' ? Number(input.value) : input.value
          const trial = normalizeSettings({ ...state.settings, [input.name]: value })
          if (trial[input.name] === value) merged[input.name] = value
          else rejected = true
        }
        state.settings = merged
        for (const input of card.querySelectorAll('input, select')) {
          if (settingNames.includes(input.name)) input.value = merged[input.name]
        }
        let note = card.querySelector('.np-setting-note')
        if (rejected) {
          if (!note) {
            note = document.createElement('p')
            note.className = 'np-setting-note'
            card.append(note)
          }
          note.textContent = text().invalidSetting
          return
        }
        note?.remove()
        if (state.db) void writeSettings(state.db, merged).catch(showError)
        armCommit()
        render()
      })
    })
  }

  function confirmClearFile() {
    const file = current()
    if (!file) return
    const copy = text()
    dialog(`<h3>${copy.clearFileTitle}</h3><p>${copy.clearFileBody(file.name)}</p><div class="np-actions"><button type="button" data-go="cancel">${copy.cancel}</button><button type="button" class="np-danger" data-go="confirm">${copy.clear}</button></div>`, (card, close) => {
      card.querySelector('[data-go="cancel"]').focus()
      card.addEventListener('click', event => {
        const choice = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (choice === 'cancel') close()
        if (choice === 'confirm') void clearCurrentFile().then(close).catch(showError)
      })
    })
  }

  function confirmClear(closeSettings) {
    const copy = text()
    dialog(`<h3>${copy.clearAllTitle}</h3><p>${copy.clearAllBody}</p><div class="np-actions"><button type="button" data-go="cancel">${copy.cancel}</button><button type="button" class="np-danger" data-go="confirm">${copy.deleteAll}</button></div>`, (card, close) => {
      card.querySelector('[data-go="cancel"]').focus()
      card.addEventListener('click', event => {
        const action = event.target instanceof HTMLElement ? event.target.dataset.go : undefined
        if (action === 'cancel') close()
        if (action === 'confirm' && state.db) {
          void clearContent(state.db).then(() => {
            state.nodes = []
            state.ui.tabs = []
            state.ui.currentId = null
            close()
            closeSettings()
            render()
          }).catch(showError)
        }
      })
    })
  }

  async function openHistory() {
    const file = current()
    if (!file || !state.db) return
    const versions = await versionsOf(state.db, file.id)
    const copy = text()
    const rows = versions.map(version => `<button type="button" data-version="${version.id}">${new Date(version.createdAt).toLocaleString()} · ${copy.reasons[version.reason] ?? version.reason} · ${version.markdown.length}</button>`).join('')
    dialog(`<h3>${copy.historyTitle}</h3><div class="np-versions">${rows || `<p>${copy.noVersions}</p>`}</div><div class="np-actions"><button type="button" data-go="close">${copy.close}</button></div>`, (card, close) => {
      card.addEventListener('click', event => {
        const target = event.target instanceof HTMLElement ? event.target : null
        if (target?.dataset.go === 'close') close()
        const id = target?.dataset.version
        const version = versions.find(item => item.id === id)
        if (!version) return
        const previewCopy = text()
        dialog(`<h3>${previewCopy.previewAt(new Date(version.createdAt).toLocaleString())}</h3><pre>${version.markdown.replace(/[&<>]/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])}</pre><div class="np-actions"><button type="button" data-go="back">${previewCopy.back}</button><button type="button" data-go="restore">${previewCopy.restore}</button></div>`, (preview, closePreview) => {
          preview.addEventListener('click', previewEvent => {
            const action = previewEvent.target instanceof HTMLElement ? previewEvent.target.dataset.go : undefined
            if (action === 'back') closePreview()
            if (action === 'restore') {
              write().value = version.markdown
              const live = current()
              if (live) live.draft = version.markdown
              void commit('restore').then(() => { closePreview(); close(); render() }).catch(showError)
            }
          })
        })
      })
    })
  }

  function drag(node, onEnd) {
    let startX = 0
    let startY = 0
    let originX = 0
    let originY = 0
    let moved = false
    const move = event => {
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.hypot(dx, dy) > 4) moved = true
      place(node, originX + dx, originY + dy)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onEnd(moved, node.offsetLeft, node.offsetTop)
    }
    node.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, a') && event.target !== node) return
      startX = event.clientX
      startY = event.clientY
      originX = node.offsetLeft
      originY = node.offsetTop
      moved = false
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    })
  }

  drag(entry, (moved, x, y) => {
    if (moved) {
      state.ui.entryX = x
      state.ui.entryY = y
      void persistUi()
      return
    }
    state.ui.open = !state.ui.open
    render()
    void persistUi()
    if (state.ui.open) void beginWriting()
  })
  const tree = must(panel, '.np-tree')
  tree.addEventListener('dragstart', event => {
    const row = event.target instanceof HTMLElement ? event.target.closest('[data-id]') : null
    if (!row || !event.dataTransfer) return
    event.dataTransfer.setData('text/plain', row.dataset.id ?? '')
    event.dataTransfer.effectAllowed = 'move'
  })
  tree.addEventListener('dragover', event => { event.preventDefault() })
  tree.addEventListener('drop', event => {
    event.preventDefault()
    const id = event.dataTransfer?.getData('text/plain')
    if (!id || !state.db) return
    const row = event.target instanceof HTMLElement ? event.target.closest('[data-id]') : null
    const target = row ? state.nodes.find(node => node.id === row.dataset.id) : null
    const parentId = target ? (target.kind === 'folder' ? target.id : target.parentId) : null
    const workspaceId = target ? target.workspaceId ?? null : activeWorkspace().id
    void moveNode(state.db, id, parentId, workspaceId).then(moved => {
      const node = state.nodes.find(item => item.id === id)
      if (node) {
        node.parentId = moved.parentId
        node.workspaceId = moved.workspaceId
      }
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
  drag(must(panel, '.np-tabs'), (moved, x, y) => {
    if (!moved) return
    state.ui.panelX = x
    state.ui.panelY = y
    void persistUi()
  })

  function requestDelete(id) {
    if (!state.db) return
    const node = state.nodes.find(item => item.id === id)
    if (!node) return
    const copy = text()
    const nested = state.nodes.some(item => item.parentId === id)
    const title = node.kind === 'folder' ? copy.deleteFolderTitle : copy.deleteFileTitle
    const body = node.kind === 'folder' ? (nested ? copy.deleteFolderBody : copy.deleteEmptyFolderBody) : copy.deleteFileBody(node.name)
    dialog(`<h3>${title}</h3><p>${body}</p><div class="np-actions"><button type="button" data-go="cancel">${copy.cancel}</button><button type="button" class="np-danger" data-go="confirm">${copy.delete}</button></div>`, (card, close) => {
      card.querySelector('[data-go="cancel"]').focus()
      card.addEventListener('click', click => {
        const choice = click.target instanceof HTMLElement ? click.target.dataset.go : undefined
        if (choice === 'cancel') close()
        if (choice === 'confirm') { close(); void forget(id) }
      })
    })
  }

  panel.addEventListener('click', event => {
    const caret = event.target instanceof HTMLElement ? event.target.closest('[data-caret]') : null
    if (caret?.dataset.caret) {
      const id = caret.dataset.caret
      if (state.collapsed.has(id)) state.collapsed.delete(id)
      else state.collapsed.add(id)
      render()
      return
    }
    const rowAction = event.target instanceof HTMLElement ? event.target.closest('[data-rename], [data-pin], [data-remove]') : null
    if (rowAction?.dataset.rename && state.db) {
      const node = state.nodes.find(item => item.id === rowAction.dataset.rename)
      if (node) askName(text().renameTitle, node.name, async name => {
        const renamed = await renameNode(state.db, node.id, name)
        Object.assign(node, renamed)
        render()
      })
      return
    }
    if (rowAction?.dataset.pin && state.db) {
      const node = state.nodes.find(item => item.id === rowAction.dataset.pin)
      if (node) void pinNode(state.db, node.id, node.pinned !== true).then(updated => {
        Object.assign(node, updated)
        render()
      }).catch(showError)
      return
    }
    if (rowAction?.dataset.remove) {
      requestDelete(rowAction.dataset.remove)
      return
    }
    const target = event.target instanceof Element ? event.target.closest('[data-action], [data-format], [data-tab], [data-close], [data-id]') : null
    if (!(target instanceof HTMLElement)) return
    const action = target.dataset.action
    if (action === 'close' || action === 'tree') {
      state.ui.open = false
      write().blur()
      render()
      void persistUi()
    }
    if (action === 'settings') openSettings()
    if (action === 'toggle-tree') {
      state.ui.treeOpen = state.ui.treeOpen === false
      render()
      void persistUi()
    }
    if (action === 'new-file') void add('file').catch(showError)
    if (action === 'new-folder') void add('folder').catch(showError)
    if (action === 'rename' && state.ui.currentId) {
      const node = state.nodes.find(item => item.id === state.ui.currentId)
      if (node && state.db) askName(text().renameTitle, node.name, async name => {
        const renamed = await renameNode(state.db, node.id, name)
        Object.assign(node, renamed)
        render()
      })
    }
    if (action === 'delete' && state.ui.currentId) requestDelete(state.ui.currentId)
    if (action === 'clear-file') confirmClearFile()
    if (action === 'save-version') void commit('manual').catch(showError)
    if (action === 'view' && target.dataset.view) {
      state.view = target.dataset.view === 'rendered' ? 'rendered' : 'source'
      void renderBody()
    }
    if (action === 'copy') void navigator.clipboard?.writeText(must(panel, '.np-pathname').textContent ?? '')
    if (action === 'history') void openHistory().catch(showError)
    if (action === 'image') must(panel, '.np-file').click()
    const format = target.dataset.format
    if (format) {
      const source = write()
      const applied = applyFormat(source.value, source.selectionStart, source.selectionEnd, format)
      source.value = applied.text
      source.setSelectionRange(applied.cursor, applied.cursor)
      scheduleSave()
    }
    const tab = target.dataset.tab ?? target.dataset.close
    if (target.dataset.close) {
      state.ui.tabs = state.ui.tabs.filter(id => id !== target.dataset.close)
      if (state.ui.currentId === target.dataset.close) state.ui.currentId = state.ui.tabs.at(-1) ?? null
      render(); void persistUi()
    } else if (target.dataset.tab) openFile(tab)
    const row = target.closest('[data-id]')
    const id = row?.dataset.id
    if (id) {
      const node = state.nodes.find(item => item.id === id)
      if (node?.kind === 'file') openFile(id)
      else { state.ui.currentId = id; render() }
    }
  })
  must(panel, '.np-workspace').addEventListener('change', event => {
    const select = event.target
    if (!(select instanceof HTMLSelectElement)) return
    state.ui.workspaceChoice = select.value
    state.ui.currentId = null
    render()
    void persistUi()
  })
  const slashMenu = must(panel, '.np-slash')
  function paintSlash() {
    const copy = text()
    slashMenu.innerHTML = [...FORMAT_KINDS, 'image'].map(kind => `<button type="button" data-slash="${kind}">${kind === 'image' ? copy.image : (copy.formats[kind] ?? kind.toUpperCase())}</button>`).join('')
  }
  paintSlash()
  function slashOpen() {
    const source = write()
    const before = source.value.slice(0, source.selectionStart)
    return before.endsWith('\n/') || before === '/'
  }
  write().addEventListener('input', () => {
    state.slash = slashOpen()
    slashMenu.hidden = !state.slash
    scheduleSave()
  })
  function insertSlash(kind) {
    const source = write()
    source.setRangeText('', source.selectionStart - 1, source.selectionStart)
    state.slash = false
    slashMenu.hidden = true
    const applied = applyFormat(source.value, source.selectionStart, source.selectionStart, kind)
    source.value = applied.text
    source.setSelectionRange(applied.cursor, applied.cursor)
    scheduleSave()
  }
  write().addEventListener('keydown', event => {
    if (!state.slash) return
    if (event.key === 'Escape') {
      state.slash = false
      slashMenu.hidden = true
      return
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    insertSlash('bullet')
  })
  slashMenu.addEventListener('click', event => {
    const kind = event.target instanceof HTMLElement ? event.target.dataset.slash : undefined
    if (kind === 'image') must(panel, '.np-file').click()
    else if (kind) insertSlash(kind)
    state.slash = false
    slashMenu.hidden = true
  })
  must(panel, '.np-read').addEventListener('pointerdown', event => {
    if (event.target instanceof HTMLElement && event.target.closest('a')) return
    event.preventDefault()
    void beginWriting()
  })
  panel.addEventListener('click', event => {
    if (!(event.target instanceof HTMLElement) || event.target.closest('.np-slash')) return
    if (state.slash && event.target !== write()) {
      state.slash = false
      slashMenu.hidden = true
    }
  })
  must(panel, '.np-file').addEventListener('change', event => {
    const input = /** @type {HTMLInputElement} */ (event.target)
    const file = input.files?.[0]
    input.value = ''
    if (!file || !state.db) return
    void storeImage(state.db, file, state.settings.imageLimitBytes).then(image => {
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
    const image = [...(event.dataTransfer?.files ?? [])].find(file => file.type.startsWith('image/'))
    if (!image) return
    event.preventDefault()
    event.stopPropagation()
    insertStoredImage(image)
  })
  panel.addEventListener('paste', event => {
    const image = [...(event.clipboardData?.files ?? [])].find(file => file.type.startsWith('image/'))
    if (!image || !state.db) return
    event.preventDefault()
    void storeImage(state.db, image, state.settings.imageLimitBytes).then(stored => {
      const source = write()
      source.setRangeText(`![image](notepad-image:${stored.id})`, source.selectionStart, source.selectionEnd, 'end')
      state.view = 'rendered'
      scheduleSave()
      void renderBody()
    }).catch(showError)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void commit('interval').catch(showError)
  })
  window.addEventListener('resize', () => render())

  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  channel?.addEventListener('message', event => {
    if (state.dirty && event.data?.fileId === state.ui.currentId) {
      showError(new Error(text().otherTab))
      return
    }
    if (state.db) void loadSnapshot(state.db).then(snapshot => {
      state.nodes = snapshot.nodes
      state.settings = { ...defaults, ...snapshot.settings }
      render()
    })
  })

  const stop = appTheme.subscribe(() => render())
  const stopThemeInner = typeof stop === 'function' ? stop : () => {}
  const languageStop = language.subscribe(() => { paintSlash(); render() })
  const stopLanguage = typeof languageStop === 'function' ? languageStop : () => {}

  const workspaceStop = workspaces.subscribe(() => render())
  const stopWorkspaces = typeof workspaceStop === 'function' ? workspaceStop : () => {}

  const api = {
    stopTheme() { stopThemeInner(); stopLanguage(); stopWorkspaces() },
    toggle() {
      state.ui.open = !state.ui.open
      render()
      void persistUi()
      if (state.ui.open) void beginWriting()
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

  void openDatabase().then(async db => {
    state.db = db
    const snapshot = await loadSnapshot(db)
    state.nodes = snapshot.nodes
    state.settings = { ...defaults, ...snapshot.settings }
    state.ui = { ...state.ui, ...snapshot.ui, tabs: snapshot.ui.tabs ?? [] }
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
  }).catch(error => api.failed(error))
  render()
  return api
}
