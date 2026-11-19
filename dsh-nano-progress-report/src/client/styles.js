/** Progress workbench styles.
 *
 *  Rules of this sheet:
 *  - only `--dsw-alias-*` / `--dsw-radius-*` / `--dsw-font-*` / `--dsh-font-*`
 *    tokens (no hex, no rgba literals except through color-mix on a token);
 *  - row chrome comes from the host `DisclosureRow`; this sheet only pads it,
 *    colors it per event kind, and carries the drawer/status metrics;
 *  - density follows DNK's devtools (38px toolbar, 26px status line, 32px
 *    drawer head, mono for shell payloads);
 *  - prefix `npr-`; root marker `data-nano-progress-report="1"`. */
export const PROGRESS_CSS = `

[data-nano-progress-report] {
  height: 100%; min-height: 0; display: flex; flex-direction: column;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font: var(--dsw-font-xxs-12);
  container-type: inline-size;
}

/* ── toolbar: host search field, DNK density ─────────────────────────── */
.npr-toolbar {
  flex: none; display: flex; align-items: center; gap: 8px;
  box-sizing: border-box; height: 38px; padding: 5px 8px;
  border-bottom: .5px solid var(--dsw-alias-border-l3);
}
/* The host Input renders this class on the <input> itself, and its own
   component CSS (CSS-in-JS, injected after plugin styles) wins every tie — so
   the field chrome is scoped one level up to keep the DNK search box look. */
[data-nano-progress-report] .npr-search {
  flex: 1 1 auto; min-width: 0;
  box-sizing: border-box; height: 26px; padding: 0 8px;
  border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary); font: inherit;
}
[data-nano-progress-report] .npr-search:focus-within {
  border-color: var(--dsw-alias-state-business-primary);
}
[data-nano-progress-report] .npr-search::placeholder { color: var(--dsw-alias-label-tertiary); }
.npr-stats {
  flex: none; color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11); white-space: nowrap;
}
.npr-stats[data-bad="true"] { color: var(--dsw-alias-state-error-primary); }

/* ── timeline ────────────────────────────────────────────────────────── */
.npr-flow { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 3px 0 6px; }
.npr-older { display: flex; justify-content: center; padding: 2px 0 4px; }
.npr-rows { position: relative; display: flex; flex-direction: column; }
.npr-empty {
  padding: 26px 16px; text-align: center;
  color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxs-12);
}

/* The host row is a 24px process line; pad and tint it per event kind. */
.npr-row {
  margin: 0 4px; padding: 0 6px; border-radius: var(--dsw-radius-sm);
  animation: npr-row-in .16s ease-out;
}
.npr-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.npr-row[data-type="prompt"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
}
.npr-row[data-type="prompt"]:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
.npr-row[data-status="failed"] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  box-shadow: inset 2px 0 0 var(--dsw-alias-state-error-primary);
}
.npr-row[data-status="running"] { box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary); }
.npr-row[data-status="awaiting"] { box-shadow: inset 2px 0 0 var(--dsw-alias-state-warn-primary); }
.npr-row-inner { flex: 1 1 auto; min-width: 0; }
/* The shimmer root is an inline-grid; make it a flex box so the text slot can
   shrink instead of sizing to max-content (that is what enables the ellipsis). */
.npr-row-grow { display: flex; flex: 1 1 auto; min-width: 0; max-width: 100%; width: auto; overflow: hidden; }
.npr-row-title { min-width: 0; white-space: nowrap; }
/* TextShimmer nests the string two spans deep; the ellipsis has to sit on the
   element that owns the text, so the content slot gets it here. Presentational
   only — a structure change degrades to a plain clip. */
.npr-row-content { flex: 1 1 auto; min-width: 0; overflow: hidden; }
.npr-row-content > span {
  /* Host CSS pins the text span to flex:0 0 auto; without a shrink factor it
     keeps its max-content width and the parent merely clips it (no ellipsis). */
  flex: 1 1 auto;
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.npr-row-chev { color: var(--dsw-alias-label-tertiary); }

/* Leading glyph: catalog icon, tinted by what the row is. The human prompt is
 * the only filled chip — that is the Devin distinction between "I said this"
 * and "the machine did this". */
.npr-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: var(--dsw-radius-xs);
  color: var(--dsw-alias-label-tertiary);
}
.npr-icon[data-type="prompt"] {
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent);
  box-shadow: inset 0 0 0 .5px color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
}
.npr-icon[data-type="message"] { color: var(--dsw-alias-link); }
.npr-icon[data-type="shell"] { color: var(--dsw-alias-state-success-primary); }
.npr-icon[data-type="file"] { color: var(--dsw-alias-label-secondary); }
.npr-icon[data-type="web"] { color: var(--dsw-alias-state-business-primary); }
.npr-icon[data-type="todo"] { color: var(--dsw-alias-state-done-primary); }
.npr-icon[data-type="wait"] { color: var(--dsw-alias-state-warn-primary); }
.npr-icon[data-type="job"] { color: var(--dsw-alias-state-business-primary); }
.npr-icon[data-type="lifecycle"] { color: var(--dsw-alias-label-dimmed); }
.npr-row[data-status="failed"] .npr-icon { color: var(--dsw-alias-state-error-primary); }

/* Title weight/colour per kind: conversation is primary, machinery secondary,
 * boundaries recede. */
.npr-t-prompt { color: var(--dsw-alias-label-primary); font-weight: 600; }
.npr-t-message { color: var(--dsw-alias-label-primary); font-weight: 400; }
.npr-t-shell { color: var(--dsw-alias-label-secondary); font-family: var(--dsh-font-family-code, var(--dsh-font-family-code-default)); }
.npr-t-file, .npr-t-web, .npr-t-tool, .npr-t-subagent, .npr-t-todo { color: var(--dsw-alias-label-secondary); }
.npr-t-wait { color: var(--dsw-alias-state-warn-primary); }
.npr-t-turn, .npr-t-job { color: var(--dsw-alias-label-tertiary); }
.npr-t-lifecycle { color: var(--dsw-alias-label-dimmed); }
.npr-row[data-status="failed"] .npr-row-title { color: var(--dsw-alias-state-error-primary); }

.npr-row-tail { flex: none; display: flex; align-items: center; gap: 6px; padding-left: 4px; }
.npr-row-time {
  flex: none; color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11); white-space: nowrap;
}
.npr-row-fail { display: inline-flex; color: var(--dsw-alias-state-error-primary); }

/* Expanded payload: mono, wrapped, scroll-capped. */
.npr-detail {
  margin: 2px 0 6px 22px; padding: 6px 8px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-2);
  font-family: var(--dsh-font-family-code, var(--dsh-font-family-code-default)); font-size: 11px; line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  max-height: 220px; overflow: auto;
}
.npr-detail-line { display: flex; gap: 6px; }
.npr-detail-label { flex: none; color: var(--dsw-alias-label-tertiary); }
.npr-detail-value { min-width: 0; white-space: pre-wrap; word-break: break-word; }
.npr-subcalls { margin-top: 4px; padding-top: 4px; border-top: .5px solid var(--dsw-alias-border-l3); }
.npr-subcall { display: flex; gap: 6px; }
.npr-subcall-name { flex: none; color: var(--dsw-alias-label-tertiary); }
.npr-subcall-summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.npr-subcall[data-status="failed"] .npr-subcall-summary { color: var(--dsw-alias-state-error-primary); }

/* ── status line (DNK .nks-status metric) ────────────────────────────── */
.npr-status {
  flex: none; display: flex; align-items: center; gap: 8px;
  height: 26px; padding: 0 10px;
  border-top: .5px solid var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11);
}
.npr-status-spacer { flex: 1 1 auto; }
.npr-status-item { white-space: nowrap; }
.npr-status-item[data-bad="true"] { color: var(--dsw-alias-state-error-primary); }
.npr-status-item[data-state="running"] { color: var(--dsw-alias-state-business-primary); }
.npr-status-item[data-state="awaiting"] { color: var(--dsw-alias-state-warn-primary); }

/* ── drawer (DNK devtools pattern) ───────────────────────────────────── */
.npr-drawer {
  flex: none; position: relative; display: flex; flex-direction: column;
  /* Inline height is the panel's outer height: the drag clamp must not leak
     the top hairline into the measured box. */
  box-sizing: border-box;
  min-height: 0; border-top: .5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
}
.npr-grip {
  position: absolute; left: 0; right: 0; top: -3px; height: 7px;
  cursor: row-resize; z-index: var(--nano-layer-local1); touch-action: none;
}
.npr-grip:hover { background: color-mix(in srgb, var(--dsw-alias-link) 35%, transparent); }
.npr-drawer[data-collapsed="true"] { height: auto; min-height: 0; }
.npr-drawer-head {
  flex: none; display: flex; align-items: center; gap: 8px;
  min-height: 32px; padding: 2px 6px;
  border-bottom: .5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}
.npr-drawer-scale { flex: none; display: flex; transform: scale(.84); transform-origin: left center; }
.npr-drawer-spacer { flex: 1 1 auto; }
.npr-drawer-count {
  flex: none; color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11); white-space: nowrap;
}
.npr-drawer-body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 8px 12px 10px;
  animation: npr-body-in .14s ease-out;
}

/* ── tasks / jobs: host TodoPanel metrics ────────────────────────────── */
.npr-tasks, .npr-jobs { display: flex; flex-direction: column; gap: 8px; }
.npr-task, .npr-job {
  display: flex; align-items: center; gap: 10px; min-width: 0;
  font: var(--dsw-font-xs-13); line-height: 20px;
  color: var(--dsw-alias-label-secondary);
  transition: color 100ms ease;
}
.npr-task:hover, .npr-job:hover { color: var(--dsw-alias-label-primary); }
.npr-task[data-status="completed"] { color: var(--dsw-alias-label-tertiary); }
.npr-task[data-status="in_progress"] { color: var(--dsw-alias-label-primary); }
.npr-task-glyph { flex: none; display: grid; place-items: center; width: 16px; height: 16px; }
.npr-task-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.npr-task-state {
  flex: none; margin-left: auto; padding-left: 8px;
  color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11);
}
.npr-job[data-status="failed"] .npr-task-text,
.npr-job[data-status="killed"] .npr-task-text { color: var(--dsw-alias-state-error-primary); }

@keyframes npr-row-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes npr-body-in { from { opacity: 0 } to { opacity: 1 } }

@media (prefers-reduced-motion: reduce) {
  .npr-row, .npr-drawer-body, .npr-task, .npr-job { animation: none; transition: none; }
}
`
