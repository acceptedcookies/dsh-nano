/** Cloud-session sidebar section + dialogs. Only layout glue lives here:
 *  every button and glyph comes from @deepseek-ai/dsh-client-ui-primitives,
 *  and the section reuses the workspace browser's own class names read from
 *  the live DOM, so its header geometry matches the native 工作区 section. */
export const CLOUD_CSS = `
[data-nano-cloud-session-section] { flex: none; min-height: 0; }
[data-nano-cloud-session-section] > * { flex: none; }
.dncs-section { display: flex; flex-direction: column; flex: none; box-sizing: border-box; width: 100%; padding-right: 9px; }
.dncs-section [class*="listArea"], .dncs-section [class*="list"] { flex: none; }
.dncs-section [class*="list"] { padding-bottom: 0; }
.dncs-section-empty { color: var(--dsw-alias-label-tertiary, #999); }
.nano-dialog-card:has(.dncs-settings-root) { width: min(704px, calc(100vw - 48px)); height: min(640px, calc(100vh - 96px)); max-height: min(640px, calc(100vh - 96px)); }
.nano-dialog-card:has(.dncs-settings-root) .nano-dialog-content { min-height: 0; overflow: auto; }
.dncs-settings-root { height: 100%; display: flex; flex-direction: column; min-height: 0; }
.dncs-settings-root > [role="tabpanel"] { min-height: 0; overflow: auto; }
.nano-dialog-card:has(.dncs-session-root) { width: min(680px, calc(100vw - 48px)); max-height: min(640px, calc(100vh - 96px)); }
.nano-dialog-card:has(.dncs-new-root) { width: min(560px, calc(100vw - 48px)); }
.dncs-settings-panel { display: flex; flex-direction: column; gap: 10px; padding: 2px 0 8px; }
.dncs-profile-card { border: 1px solid var(--dsw-alias-border-primary, #33363c); border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
.dncs-profile-card[data-active="true"] { border-color: var(--dsw-alias-accent-primary, #4c8dff); }
.dncs-profile-head { display: flex; align-items: center; gap: 8px; }
.dncs-profile-meta { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); overflow-wrap: anywhere; }
.dncs-profile-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.dncs-field-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.dncs-field-label { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.dncs-tabs-host { margin-bottom: 8px; }
.dncs-messages { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow: auto; margin: 8px 0; }
.dncs-message { padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-bg-secondary, #22252b); white-space: pre-wrap; word-break: break-word; }
.dncs-message[data-role="user"] { background: var(--dsw-alias-interactive-bg-hover, #2a2e35); }
.dncs-message-meta { font-size: 10px; color: var(--dsw-alias-label-secondary, #9aa0a6); margin-bottom: 3px; display: flex; gap: 8px; }
.dncs-kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 12px; }
.dncs-kv dt { color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-kv dd { margin: 0; overflow-wrap: anywhere; }
.dncs-code { font-family: var(--dsw-mono, ui-monospace, monospace); font-size: 11px; overflow-wrap: anywhere; }
.dncs-inline { display: flex; align-items: center; gap: 8px; }
.dncs-inline > * { min-width: 0; }
.dncs-note { font-size: 12px; padding: 8px 10px; border-radius: 6px; background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-note[data-kind="error"] { color: var(--dsw-alias-label-danger, #ff7b72); }
.dncs-spin { animation: dncs-spin .8s linear infinite; transform-origin: center; }
@keyframes dncs-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .dncs-spin { animation: none; } }
`
