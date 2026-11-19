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

/* Section shell. Geometry mirrors the native sidebar's measured values: rows
 * are x8..272 (264 wide), the leading slot lands at x20, titles at x42, the
 * section label is 14px/400/tertiary and header icon buttons are 28×28. All
 * values are authored here; no host custom property or class is read. */
.dncs-section { display: flex; flex-direction: column; flex: none; box-sizing: border-box; width: 100%; padding: 0 var(--nano-space-2) 0 0; }
.dncs-section-header { display: flex; align-items: center; gap: var(--nano-space-1); min-height: 36px; padding: 0 1px 0 var(--nano-space-3); }
.dncs-section-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 14px; font-weight: 400; }
.dncs-section-actions { flex: none; display: flex; align-items: center; gap: var(--nano-space-1); }
/* Native icon buttons in section headers are a fixed 28×28 secondary square;
 * the host Button sm icon-only stays 36 wide, so we set our own box. */
.dncs-icon-btn { width: 28px; height: 28px; min-width: 28px; padding: 0; justify-content: center; color: var(--dsw-alias-label-secondary); }
.dncs-icon-btn-row { width: 24px; height: 20px; min-width: 24px; }
.dncs-section-list { display: flex; flex-direction: column; min-height: 0; }
.dncs-section-body { display: flex; flex-direction: column; animation: dncs-section-in .32s cubic-bezier(.22, 1, .36, 1) both; }
.dncs-section-count { display: inline-flex; align-items: center; }
/* Native group rows are 34px tall on the x8..264 track: chevron slot at x20,
 * icon and title 6px apart, title 14px primary. Self-drawn — DisclosureRow's
   * internal header ignores root padding (see section.js). */
.dncs-disc { box-sizing: border-box; display: flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 10px 0 12px; border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-primary); cursor: pointer; }
.dncs-disc:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dncs-disc:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color); outline-offset: -2px; }
.dncs-disc-slot { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 20px; color: var(--dsw-alias-label-tertiary); }
.dncs-disc-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
/* Collapsed rail entry: a single centered 36px icon row. No horizontal padding
 * — the rail is 56px wide. */
.dncs-rail { padding: 0; align-items: center; margin-bottom: var(--nano-space-3); }
.dncs-rail button { width: 36px; height: 36px; justify-content: center; }

.dncs-session { display: flex; align-items: center; gap: 0; min-height: 32px; padding: 0 10px 0 var(--nano-space-3); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-primary); }
.dncs-session:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dncs-session[data-active="true"] { background: var(--dsw-alias-interactive-bg-active); }
.dncs-session-main { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 0; cursor: pointer; }
.dncs-session-main:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color); outline-offset: -2px; border-radius: var(--dsw-radius-sm); }
/* Native row slot: a fixed 16×20 box; the StateDot centers inside it and the
 * title sits 6px to its right. */
.dncs-session-dot { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 20px; }
.dncs-session-title { flex: 1 1 auto; min-width: 0; margin-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.dncs-session-time { flex: none; margin-left: var(--nano-space-1); color: var(--dsw-alias-label-tertiary); font-size: 10px; }
/* Native session-row cadence: resting shows the time, the action slot only
 * appears on hover/focus and takes the time's place. */
.dncs-session-actions { flex: none; display: none; align-items: center; }
.dncs-filter-row { display: flex; gap: var(--nano-space-1); padding: 0 var(--nano-space-2) var(--nano-space-1); }
.dncs-filter-row button[data-active="true"] { font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
.dncs-manage-actions { display: flex; flex-direction: column; gap: var(--nano-space-2); margin-top: var(--nano-space-3); align-items: stretch; }
.dncs-manage-danger { color: var(--dsw-alias-label-danger); }
.dncs-session:hover .dncs-session-actions, .dncs-session:focus-within .dncs-session-actions { display: inline-flex; }
.dncs-session:hover .dncs-session-time, .dncs-session:focus-within .dncs-session-time { display: none; }

.dncs-empty-row { display: flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px 0 var(--nano-space-3); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-tertiary); font-size: 13px; cursor: pointer; }
.dncs-empty-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dncs-empty-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dncs-section-muted { cursor: default; opacity: .65; }
.dncs-error-row { padding: var(--nano-space-1) 10px var(--nano-space-1) var(--nano-space-3); color: var(--dsw-alias-state-error-primary); font-size: 12px; overflow-wrap: anywhere; }

.dncs-skeleton-row { display: flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px 0 var(--nano-space-3); pointer-events: none; }
.dncs-skeleton-dot { display: block; flex: none; width: 14px; height: 14px; margin: 3px 1px; border-radius: 4px; background: var(--dsw-alias-bg-skeleton, rgba(255,255,255,.09)); animation: dncs-skeleton 1.4s ease-in-out infinite; }
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
.dncs-attach-tab { display: flex; flex-direction: column; min-height: 0; padding: var(--nano-space-3) var(--nano-space-3); gap: var(--nano-space-2); }
.dncs-attach-head { display: flex; align-items: center; justify-content: space-between; }
.dncs-attach-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dncs-attach-state { font-size: 12px; color: var(--dsw-alias-label-secondary); display: flex; align-items: center; gap: var(--nano-space-2); padding: var(--nano-space-2) 0; }
.dncs-attach-state[role="alert"] { color: var(--dsw-alias-state-error-primary); }
.dncs-attach-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.dncs-attach-row { display: flex; align-items: center; gap: var(--nano-space-2); padding: var(--nano-space-2) 0; border-bottom: 1px solid var(--dsw-alias-line-l3); min-width: 0; }
.dncs-attach-icon { flex: none; color: var(--dsw-alias-label-tertiary); }
.dncs-attach-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--dsw-alias-label-primary); }
.dncs-attach-type { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dncs-attach-open { flex: none; display: inline-flex; color: var(--dsw-alias-label-secondary); }
.dncs-attach-open:hover { color: var(--dsw-alias-label-primary); }
`
