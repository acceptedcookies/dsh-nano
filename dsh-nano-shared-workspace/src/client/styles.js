/**
 * The section's look mirrors the workspace browser's header geometry — same
 * 36px toolbar height, same `--dsh-sidebar-row-padding` offset, same alias
 * tokens — so it reads as a native section, not an injected card.
 */

export const STYLE = `
.nsw-graft { flex: none; min-height: 0; }
/* The harvested root/list rules are the main workspace scroller (flex:1,
   a 16px fade tail). This section sits above that scroller and stays
   content-sized; otherwise mounting it stretches the sidebar. */
.nsw-graft > * { flex: none; }
.nsw-graft [class*="listArea"],
.nsw-graft [class*="treeBody"],
.nsw-graft [class*="list"] { flex: none; }
.nsw-graft [class*="list"] { padding-bottom: 0; }
.nsw-root {
  --nsw-toolbar-height: 36px;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: none;
}
.nsw-section-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  height: var(--nsw-toolbar-height);
  padding-left: var(--dsh-sidebar-row-padding, 12px);
  padding-right: 2px;
  box-sizing: border-box;
  border-radius: var(--dsw-radius-md, 6px);
  color: var(--dsw-alias-label-tertiary, #999);
}
.nsw-section-label {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: normal;
  text-transform: none;
  line-height: 20px;
  white-space: nowrap;
  color: inherit;
}
.nsw-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0;
}
.nsw-icon-button {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--dsw-radius-sm, 4px);
  padding: 0;
  background: transparent;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #888);
}
@media (hover: hover) {
  .nsw-icon-button:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.06)); }
}
.nsw-icon-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary, #6e29f6);
  outline-offset: -2px;
}
.nsw-body {
  /* No padding/font here: native projectRow/projectText inherit their own
     metrics — any size on this container overrides their cascade. */
  padding: 0;
  color: var(--dsw-alias-label-secondary, #888);
}
.nsw-empty-hint {
  display: inline-flex;
  align-items: center;
  margin: 0;
  /* Align with a projectRow's icon column, not the section padding edge. */
  padding: 4px 0 4px calc(var(--dsh-sidebar-row-padding, 12px) + 4px);
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 400;
  letter-spacing: normal;
  color: var(--dsw-alias-label-tertiary, #999);
  cursor: pointer;
  text-align: left;
}
.nsw-notice { margin: 4px 0 0; font-size: 11px; color: var(--dsw-alias-label-secondary, #888); }
.nsw-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 0;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  text-align: left;
  border-radius: var(--dsw-radius-sm, 4px);
}
.nsw-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.05)); }
.nsw-row-icon { width: 16px; flex: 0 0 16px; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-row-icon[data-joined="true"] { color: var(--dsw-alias-label-secondary, #ccc); }
.nsw-row-icon[data-joined="false"] { opacity: .55; }
.nsw-row-title { flex: 1 1 auto; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nsw-row-badge { flex: 0 0 auto; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-session-row { padding-left: 14px; }
.nsw-session-indent { width: 12px; }
.nsw-session-row .nsw-row-title { font-size: 12px; color: var(--dsw-alias-label-secondary, #ccc); }
.nsw-transcript-meta { margin-bottom: 10px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-transcript-body { max-height: 56vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; }
.nsw-transcript-row { display: flex; flex-direction: column; gap: 2px; }
.nsw-transcript-role { font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-transcript-text { font-size: 12.5px; white-space: pre-wrap; word-break: break-word; }
.nsw-role-user .nsw-transcript-role { color: #64b5f6; }
.nsw-role-tool .nsw-transcript-text { font-family: var(--dsw-mono, monospace); font-size: 11px; opacity: .8; }
.nsw-create-body { display: flex; flex-direction: column; gap: 8px; min-width: 320px; }
.nsw-field { display: flex; flex-direction: column; gap: 4px; }
.nsw-field-label { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #999); }
.nsw-input {
  padding: 6px 8px; font: inherit; font-size: 12.5px;
  background: var(--dsw-alias-fill-tertiary, rgba(255,255,255,.06));
  border: 1px solid var(--dsw-alias-line-subtle, rgba(255,255,255,.12));
  border-radius: 6px; color: inherit; outline: none;
}
.nsw-input:focus { border-color: var(--dsw-alias-accent, #5b8cff); }
.nsw-crumbs { display: flex; flex-wrap: wrap; gap: 2px; font-size: 11.5px; }
.nsw-crumb { border: none; background: none; padding: 0 2px; font: inherit; color: var(--dsw-alias-accent, #5b8cff); cursor: pointer; }
.nsw-crumb:hover { text-decoration: underline; }
.nsw-crumb-sep { color: var(--dsw-alias-label-tertiary, #999); }
.nsw-entries {
  max-height: 220px; min-height: 80px; overflow-y: auto;
  border: 1px solid var(--dsw-alias-line-subtle, rgba(255,255,255,.12));
  border-radius: 6px; padding: 4px; display: flex; flex-direction: column;
}
.nsw-entry {
  text-align: left; border: none; background: none; font: inherit; font-size: 12.5px;
  padding: 4px 8px; border-radius: 4px; cursor: pointer; color: inherit;
}
.nsw-entry:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06)); }
.nsw-entry-selected { background: var(--dsw-alias-accent-dim, rgba(91,140,255,.18)); }
.nsw-link-button { border: none; background: none; font: inherit; font-size: 11.5px; color: var(--dsw-alias-accent, #5b8cff); cursor: pointer; padding: 0; align-self: flex-start; }
.nsw-new-folder { display: flex; gap: 6px; }
.nsw-footer { display: flex; justify-content: flex-end; margin-top: 12px; }
.nsw-button {
  padding: 6px 14px; font: inherit; font-size: 12.5px; border-radius: 6px;
  border: 1px solid var(--dsw-alias-line-subtle, rgba(255,255,255,.14));
  background: var(--dsw-alias-fill-tertiary, rgba(255,255,255,.08)); color: inherit; cursor: pointer;
}
.nsw-button:disabled { opacity: .45; cursor: default; }
.nsw-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.12)); }
@media (hover: hover) {
  .nsw-empty-hint:hover { color: var(--dsw-alias-label-secondary, #888); text-decoration: underline; }
}
.nsw-rail {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
}
.nsw-rail-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--dsw-radius-md, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #888);
  cursor: pointer;
}
@media (hover: hover) {
  .nsw-rail-button:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.06)); }
}
/* Settings dialog body */
.nsw-endpoint {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.04));
}
.nsw-endpoint-row { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }
.nsw-endpoint-key { flex: none; color: var(--dsw-alias-label-tertiary, #999); min-width: 52px; }
.nsw-endpoint-key[data-long] { min-width: 72px; }
.nsw-identity { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }
.nsw-identity-value {
  font-weight: 500;
  color: var(--dsw-alias-label-primary, inherit);
  word-break: break-all;
}
.nsw-identity-value[data-masked] {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 400;
  color: var(--dsw-alias-label-secondary, #888);
}
.nsw-endpoint-value {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  word-break: break-all;
  color: var(--dsw-alias-label-secondary, #888);
}
.nsw-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.nsw-field-label { font-size: 12px; color: var(--dsw-alias-label-secondary, #888); }
.nsw-join-hint {
  margin: 0;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #999);
}
`
