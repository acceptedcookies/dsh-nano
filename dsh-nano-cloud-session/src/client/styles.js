/** Cloud-session sidebar section + dialogs. Only layout glue lives here:
 *  every button and glyph comes from @deepseek-ai/dsh-client-ui-primitives,
 *  and the section reuses the workspace browser's own class names read from
 *  the live DOM, so its header geometry matches the native 工作区 section. */
export const CLOUD_CSS = `

.dncs-working-page { height: 100%; overflow: auto; box-sizing: border-box; padding: 16px; display: flex; flex-direction: column; gap: 16px; color: var(--dsw-alias-label-primary, #e8eaed); font-size: 12px; }
.dncs-working-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dncs-working-title { font-size: 14px; font-weight: 600; }
.dncs-working-meta { margin-top: 4px; color: var(--dsw-alias-label-tertiary, #888); font-size: 11px; }
.dncs-working-section { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--dsw-alias-border-l3, #33363c); }
.dncs-working-section-title { display: flex; align-items: center; gap: 7px; font-weight: 600; }
.dncs-working-row { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 8px; border-radius: 8px; color: var(--dsw-alias-label-primary); }
.dncs-working-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dncs-working-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.dncs-working-kind { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; }

.dncs-file-list { display: flex; flex-direction: column; min-height: 0; }
.dncs-devin-chip { flex: none; align-self: center; height: 24px; padding: 0 8px; border-radius: 999px; display: inline-flex; align-items: center; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); font: var(--dsw-font-xxs-12, 12px/24px sans-serif); pointer-events: none; }
html[data-dncs-cloud="1"] [class*="composerSeat"] .nms-root,
html[data-dncs-cloud="1"] [class*="composerSeat"] [data-nano-model-selector="root"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label*="工作区内修改"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label*="Workspace Write"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label*="仅可查看"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label*="完全权限"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label*="Read Only"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label*="Full access"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label="添加文件或调用指令"],
html[data-dncs-cloud="1"] [class*="composerSeat"] button[aria-label*="Add files or"] {
  display: none !important;
}

[data-nano-cloud-session-section] { flex: none; min-height: 0; }
[data-nano-cloud-session-section] > * { flex: none; }
.dncs-section-body { animation: dncs-section-in .32s cubic-bezier(.22, 1, .36, 1) both; }
.dncs-skeleton-row { pointer-events: none; }
.dncs-skeleton-dot { display: block; width: 16px; height: 16px; border-radius: 4px; background: var(--dsw-alias-bg-skeleton, rgba(255,255,255,.09)); animation: dncs-skeleton 1.4s ease-in-out infinite; }
.dncs-skeleton-bar { display: block; width: 58%; height: 14px; border-radius: 4px; background: var(--dsw-alias-bg-skeleton, rgba(255,255,255,.09)); animation: dncs-skeleton 1.4s ease-in-out infinite; }
@keyframes dncs-section-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dncs-skeleton { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .dncs-section-body, .dncs-skeleton-dot, .dncs-skeleton-bar { animation: none; } }
/* Same edge rule as the native list root; the matching custom property is
 * re-declared on this element from the live native value. */
.dncs-section { display: flex; flex-direction: column; flex: none; box-sizing: border-box; width: 100%; padding-right: var(--dsh-session-list-edge-inset, 0px); }
/* Collapsed rail entry: a single centered 36px icon row matching the native
 * workspaces rail buttons. No padding-right — the rail is 56px wide. */
.dncs-section.dncs-rail { padding-right: 0; align-items: center; margin-bottom: 12px; }
.dncs-section.dncs-rail button { width: 36px; height: 36px; justify-content: center; }
/* Screen-reader-only status label beside the native StateDot marker. */
.dncs-sr-only { clip: rect(0 0 0 0); white-space: nowrap; width: 1px; height: 1px; position: absolute; overflow: hidden; }
.dncs-error-row { color: var(--dsw-alias-label-danger, #ff7b72); }
.dncs-section [class*="listArea"], .dncs-section [class*="list"] { flex: none; }
.dncs-section [class*="list"] { padding-bottom: 0; }
.dncs-section-empty { color: var(--dsw-alias-label-tertiary, #999); }
.nano-dialog-card:has(.dncs-settings-root) { width: min(704px, calc(100vw - 48px)); height: min(640px, calc(100vh - 96px)); max-height: min(640px, calc(100vh - 96px)); }
.nano-dialog-card:has(.dncs-settings-root) .nano-dialog-content { min-height: 0; overflow: auto; }
.dncs-settings-root { height: 100%; display: flex; flex-direction: column; min-height: 0; }
.dncs-settings-root > [role="tabpanel"] { min-height: 0; overflow: auto; }
.nano-dialog-card:has(.dncs-new-root) { width: min(600px, calc(100vw - 48px)); height: min(680px, calc(100vh - 96px)); max-height: min(680px, calc(100vh - 96px)); }
.nano-dialog-card:has(.dncs-new-root) .nano-dialog-content { min-height: 0; overflow: hidden; }
.dncs-new-root { height: 100%; overflow: auto; min-height: 0; }
.dncs-settings-panel { display: flex; flex-direction: column; gap: 10px; padding: 2px 0 8px; }
.dncs-preset-card { border: 1px solid var(--dsw-alias-border-primary, #33363c); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; background: var(--dsw-alias-bg-secondary, #22252b); }
.dncs-preset-block { border-top: 1px solid var(--dsw-alias-border-primary, #33363c); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.dncs-list { margin: 0; padding-left: 18px; font-size: 12px; color: var(--dsw-alias-label-secondary, #9aa0a6); display: flex; flex-direction: column; gap: 4px; }
.dncs-textarea { width: 100%; min-height: 72px; resize: vertical; font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-primary, #33363c); background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-primary, #e8eaed); box-sizing: border-box; }
.dncs-picker { display: flex; flex-direction: column; gap: 4px; }
.dncs-picker-items { display: flex; flex-wrap: wrap; gap: 4px; max-height: 132px; overflow: auto; }
.dncs-guide { border: 1px solid var(--dsw-alias-border-primary, #33363c); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.dncs-guide-step { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-guide-num { flex: none; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; background: var(--dsw-alias-accent-primary, #4c8dff); color: #fff; }
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
.dncs-pre { white-space: pre-wrap; max-height: 320px; overflow: auto; padding: 8px; background: var(--dsw-alias-bg-secondary, #22252b); border-radius: 8px; }
.dncs-code { font-family: var(--dsw-mono, ui-monospace, monospace); font-size: 11px; overflow-wrap: anywhere; }
.dncs-inline { display: flex; align-items: center; gap: 8px; }
.dncs-inline > * { min-width: 0; }
.dncs-note { font-size: 12px; padding: 8px 10px; border-radius: 6px; background: var(--dsw-alias-bg-secondary, #22252b); color: var(--dsw-alias-label-secondary, #9aa0a6); }
.dncs-note[data-kind="error"] { color: var(--dsw-alias-label-danger, #ff7b72); }
.dncs-spin { animation: dncs-spin .8s linear infinite; transform-origin: center; }
@keyframes dncs-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .dncs-spin { animation: none; } }
`
