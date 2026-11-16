/** Cloud-session sidebar section + dialogs. Only layout glue lives here:
 *  every button and glyph comes from @deepseek-ai/dsh-client-ui-primitives /
 *  dsh-nano-ui, colors and radii are host tokens, and the spacing scale is
 *  nano-ui's `--nano-space-*`. The section never copies host class names, so its
 *  header is its own row aligned with tokens (DESIGN.md §8 shell gap). */
export const CLOUD_CSS = `

.dncs-working-page { height: 100%; overflow: auto; box-sizing: border-box; padding: 16px; display: flex; flex-direction: column; gap: 16px; color: var(--dsw-alias-label-primary); font-size: 12px; }
.dncs-working-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dncs-working-title { font-size: 14px; font-weight: 600; }
.dncs-working-meta { margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dncs-working-section { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--dsw-alias-border-l3); }
.dncs-working-section-title { display: flex; align-items: center; gap: 7px; font-weight: 600; }
.dncs-working-row { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 8px; border-radius: 8px; color: var(--dsw-alias-label-primary); }
.dncs-working-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dncs-working-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.dncs-working-kind { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; }

.dncs-file-list { display: flex; flex-direction: column; min-height: 0; }

[data-nano-cloud-session-section] { flex: none; min-height: 0; }
[data-nano-cloud-session-section] > * { flex: none; }

/* Section shell. Width/padding are our own; the native list geometry custom
 * properties are host internals and are not read (DESIGN.md §8). */
.dncs-section { display: flex; flex-direction: column; flex: none; box-sizing: border-box; width: 100%; padding: 0 var(--nano-space-2); }
.dncs-section-header { display: flex; align-items: center; gap: var(--nano-space-1); min-height: 32px; padding-left: var(--nano-space-1); }
.dncs-section-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 11px; font-weight: 600; letter-spacing: .02em; }
.dncs-section-actions { flex: none; display: flex; align-items: center; gap: 2px; }
.dncs-section-list { display: flex; flex-direction: column; min-height: 0; }
.dncs-section-body { display: flex; flex-direction: column; animation: dncs-section-in .32s cubic-bezier(.22, 1, .36, 1) both; }
.dncs-section-count { display: inline-flex; align-items: center; }
/* Collapsed rail entry: a single centered 36px icon row. No horizontal padding
 * — the rail is 56px wide. */
.dncs-rail { padding: 0; align-items: center; margin-bottom: var(--nano-space-3); }
.dncs-rail button { width: 36px; height: 36px; justify-content: center; }

.dncs-session { display: flex; align-items: center; gap: var(--nano-space-1); min-height: 30px; padding: 0 var(--nano-space-1); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-primary); }
.dncs-session:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dncs-session[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); }
.dncs-session-main { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: var(--nano-space-1); cursor: pointer; }
.dncs-session-main:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color); outline-offset: -2px; border-radius: var(--dsw-radius-sm); }
.dncs-session-dot { flex: none; display: inline-flex; align-items: center; }
.dncs-session-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.dncs-session-time { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; }

.dncs-empty-row { display: flex; align-items: center; gap: var(--nano-space-1); min-height: 32px; padding: 0 var(--nano-space-1); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-tertiary); font-size: 12px; cursor: pointer; }
.dncs-empty-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dncs-empty-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dncs-section-muted { cursor: default; opacity: .65; }
.dncs-error-row { padding: var(--nano-space-1); color: var(--dsw-alias-state-error-primary); font-size: 12px; overflow-wrap: anywhere; }

.dncs-skeleton-row { display: flex; align-items: center; gap: var(--nano-space-1); min-height: 32px; padding: 0 var(--nano-space-1); pointer-events: none; }
.dncs-skeleton-dot { display: block; flex: none; width: 16px; height: 16px; border-radius: 4px; background: var(--dsw-alias-bg-skeleton, rgba(255,255,255,.09)); animation: dncs-skeleton 1.4s ease-in-out infinite; }
.dncs-skeleton-bar { display: block; width: 58%; height: 14px; border-radius: 4px; background: var(--dsw-alias-bg-skeleton, rgba(255,255,255,.09)); animation: dncs-skeleton 1.4s ease-in-out infinite; }
@keyframes dncs-section-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dncs-skeleton { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .dncs-section-body, .dncs-skeleton-dot, .dncs-skeleton-bar { animation: none; } }

/* Screen-reader-only status label beside the native StateDot marker. */
.dncs-sr-only { clip: rect(0 0 0 0); white-space: nowrap; width: 1px; height: 1px; position: absolute; overflow: hidden; }

/* Dialog bodies (sizes come from NanoDialog width/fixedHeight). */
.dncs-settings-root { height: 100%; display: flex; flex-direction: column; min-height: 0; }
.dncs-settings-panes { flex: 1 1 auto; min-height: 0; }
.dncs-new-root { height: 100%; overflow: auto; min-height: 0; }
.dncs-settings-panel { display: flex; flex-direction: column; gap: 10px; padding: 2px 0 8px; }
.dncs-preset-card { border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; background: var(--dsw-alias-bg-layer-2); }
.dncs-preset-block { border-top: 1px solid var(--dsw-alias-border-l2); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.dncs-list { margin: 0; padding-left: 18px; font-size: 12px; color: var(--dsw-alias-label-secondary); display: flex; flex-direction: column; gap: 4px; }
.dncs-textarea { width: 100%; min-height: 72px; resize: vertical; font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); box-sizing: border-box; }
.dncs-picker { display: flex; flex-direction: column; gap: 4px; }
.dncs-picker-items { display: flex; flex-wrap: wrap; gap: 4px; max-height: 132px; overflow: auto; }
.dncs-guide { border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.dncs-guide-step { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dncs-guide-num { flex: none; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-label-primary-inverted); }
.dncs-profile-card { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
.dncs-profile-card[data-active="true"] { border-color: var(--dsw-alias-state-business-primary); }
.dncs-profile-head { display: flex; align-items: center; gap: 8px; }
.dncs-profile-meta { font-size: 11px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dncs-profile-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.dncs-field-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.dncs-field-label { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dncs-kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 12px; }
.dncs-kv dt { color: var(--dsw-alias-label-secondary); }
.dncs-kv dd { margin: 0; overflow-wrap: anywhere; }
.dncs-code { font-family: var(--dsh-font-family-code); font-size: 11px; overflow-wrap: anywhere; }
.dncs-inline { display: flex; align-items: center; gap: 8px; }
.dncs-inline > * { min-width: 0; }
.dncs-note { font-size: 12px; padding: 8px 10px; border-radius: 6px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dncs-note[data-kind="error"] { color: var(--dsw-alias-state-error-primary); }
.dncs-spin { animation: dncs-spin .8s linear infinite; transform-origin: center; }
@keyframes dncs-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .dncs-spin { animation: none; } }
`
