/** Progress workbench styles.
 *
 *  Rules of this sheet:
 *  - only `--dsw-alias-*` / `--dsw-radius-*` / `--dsw-font-*` / `--dsh-font-*`
 *    tokens (no hex, no rgba literals);
 *  - row chrome comes from the host `DisclosureRow`; this sheet only sets
 *    density, text hierarchy and the trailing time;
 *  - the reading order is Devin's: one flat list, a quiet search line, and the
 *    Tasks footer. No tinted bands, no icon chips, no extra status bar;
 *  - prefix `npr-`; root marker `data-nano-progress-report="1"`. */
export const PROGRESS_CSS = `

[data-nano-progress-report] {
  height: 100%; min-height: 0; display: flex; flex-direction: column;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font: var(--dsw-font-xxs-12);
  container-type: inline-size;
}

/* The conversation view variant lives inside the host's scrolling
 * conversation body: natural height, full width, sticky search line. */
[data-nano-progress-report][data-variant="view"] {
  height: auto; min-height: 0;
  width: 100%;
  background: transparent;
}
[data-nano-progress-report][data-variant="view"] .npr-toolbar {
  position: sticky; top: 0; z-index: var(--nano-layer-local1);
  background: var(--dsw-alias-bg-base);
}
[data-nano-progress-report][data-variant="view"] .npr-flow { overflow: visible; padding-bottom: 16px; }

/* ── search line: borderless field on the panel background ───────────── */
.npr-toolbar {
  flex: none; display: flex; align-items: center; gap: 6px;
  box-sizing: border-box; height: 34px; padding: 0 10px;
  border-bottom: .5px solid var(--dsw-alias-border-l3);
}
.npr-toolbar-icon { flex: none; display: inline-flex; color: var(--dsw-alias-label-tertiary); }
/* Keep the host field as the host draws it (border, fill, focus ring); this
   sheet only lets it take the toolbar's free width. */
[data-nano-progress-report] .npr-search {
  flex: 1 1 auto; min-width: 0; height: 26px; min-height: 26px;
}
.npr-stats {
  flex: none; color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11); white-space: nowrap;
}

/* ── timeline: one flat list ─────────────────────────────────────────── */
.npr-flow { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 2px 0 4px; }
.npr-older { display: flex; justify-content: center; padding: 0; }
.npr-older button {
  height: 24px; padding: 0 8px; color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.npr-rows { position: relative; display: flex; flex-direction: column; }
.npr-turns { position: relative; display: flex; flex-direction: column; }
.npr-turn { display: flex; flex-direction: column; }
.npr-turn + .npr-turn { margin-top: 2px; }
/* The turn boundary is an indent plus a hairline, the way Devin draws it:
   prompt at the left edge, every step one level in. */
.npr-turn-body {
  margin-left: 18px;
  border-left: .5px solid var(--dsw-alias-border-l3);
}
.npr-empty {
  padding: 24px 12px; text-align: center;
  color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11);
}

.npr-row {
  margin: 0 6px; padding: 0 4px; border-radius: var(--dsw-radius-sm);
}
.npr-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.npr-row [data-disclosure-row] { min-height: 28px; }
.npr-row-inner { flex: 1 1 auto; min-width: 0; }
/* The shimmer root is an inline-grid; make it a flex box so the text slot can
   shrink instead of sizing to max-content (that is what enables the ellipsis). */
.npr-row-grow { display: flex; flex: 1 1 auto; min-width: 0; max-width: 100%; width: auto; overflow: hidden; }
.npr-row-title { min-width: 0; white-space: nowrap; font-weight: 400; }
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

/* Leading glyph: uniform tertiary, so color marks failure, not event kind.
 * Kind is carried by the glyph shape and the text shade. */
.npr-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
.npr-row[data-status="failed"] .npr-icon,
.npr-row[data-status="failed"] .npr-icon[data-type] { color: var(--dsw-alias-state-error-primary); }

/* Text hierarchy: conversation is primary, machinery secondary, boundaries
 * recede. Nothing is bold and nothing owns a background. */
.npr-t-prompt, .npr-t-message { color: var(--dsw-alias-label-primary); }
.npr-t-shell {
  color: var(--dsw-alias-label-secondary);
  font-family: var(--dsh-font-family-code, var(--dsh-font-family-code-default));
}
.npr-t-file, .npr-t-web, .npr-t-tool, .npr-t-subagent, .npr-t-todo, .npr-t-goal {
  color: var(--dsw-alias-label-secondary);
}
.npr-t-wait, .npr-t-turn, .npr-t-job { color: var(--dsw-alias-label-tertiary); }
.npr-t-lifecycle { color: var(--dsw-alias-label-dimmed); }
.npr-row[data-status="failed"] .npr-row-title { color: var(--dsw-alias-state-error-primary); }

.npr-row-tail { flex: none; display: flex; align-items: center; gap: 5px; padding-left: 6px; }
.npr-row-time {
  flex: none; color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11); white-space: nowrap;
}
.npr-row-fail { display: inline-flex; color: var(--dsw-alias-state-error-primary); }

/* Expanded payload: an indented, rule-led mono block — no card, no fill. */
.npr-detail {
  margin: 0 0 4px 24px; padding: 2px 0 2px 8px;
  border-left: .5px solid var(--dsw-alias-border-l3);
  font-family: var(--dsh-font-family-code, var(--dsh-font-family-code-default)); font-size: 11px; line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  max-height: 240px; overflow: auto;
}
.npr-detail-line { display: flex; gap: 6px; }
.npr-detail-label { flex: none; color: var(--dsw-alias-label-tertiary); }
.npr-detail-value { min-width: 0; white-space: pre-wrap; word-break: break-word; }
.npr-subcalls { margin-top: 2px; }
.npr-subcall { display: flex; gap: 6px; }
.npr-subcall-name { flex: none; color: var(--dsw-alias-label-tertiary); }
.npr-subcall-summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.npr-subcall[data-status="failed"] .npr-subcall-summary { color: var(--dsw-alias-state-error-primary); }

/* ── task bar: the Devin footer ──────────────────────────────────────── */
.npr-taskbar {
  flex: none; position: relative; display: flex; flex-direction: column;
  box-sizing: border-box; min-height: 0;
  border-top: .5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}
.npr-taskbar[data-collapsed="true"] { height: auto; }
.npr-grip {
  position: absolute; left: 0; right: 0; top: -3px; height: 6px;
  cursor: row-resize; z-index: var(--nano-layer-local1); touch-action: none;
}
.npr-grip:hover {
  background: linear-gradient(to bottom,
    color-mix(in srgb, var(--dsw-alias-link) 40%, transparent) 0 2px,
    transparent 2px);
}
.npr-taskbar-head [data-disclosure-row] { flex: 1 1 auto; min-height: 30px; padding: 0 10px; }
.npr-taskbar-head [data-disclosure-header] { padding-right: 10px; }
.npr-taskbar-icon { color: var(--dsw-alias-label-tertiary); }
.npr-taskbar-title { color: var(--dsw-alias-label-secondary); font-weight: 400; }
.npr-taskbar-chev { color: var(--dsw-alias-label-tertiary); }
.npr-taskbar-meta {
  flex: none; display: flex; align-items: center; gap: 8px; padding-left: 8px; margin-left: auto;
}
.npr-taskbar-count {
  flex: none; color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11); white-space: nowrap;
}
/* nano-ui-exempt: 宿主与 nano-ui 都没有进度条 primitive（DESIGN §10） */
.npr-progress {
  flex: none; width: 56px; height: 3px; overflow: hidden;
  border-radius: 2px; background: var(--dsw-alias-border-l3);
}
.npr-progress-fill {
  display: block; height: 100%;
  background: var(--dsw-alias-state-business-primary);
  transition: width 160ms ease-out;
}
.npr-taskbar-jobs {
  flex: none; height: 20px; padding: 0 4px;
  color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11);
}
.npr-taskbar-jobs:hover { color: var(--dsw-alias-label-primary); }
.npr-taskbar-body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  padding: 2px 10px 8px;
}

/* ── tasks / jobs rows ───────────────────────────────────────────────── */
.npr-task-list { display: flex; flex-direction: column; }
.npr-task {
  display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 26px;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
}
.npr-task:hover { color: var(--dsw-alias-label-primary); }
.npr-task-glyph { flex: none; display: grid; place-items: center; width: 16px; height: 16px; }
.npr-task-check { display: inline-flex; color: var(--dsw-alias-state-success-primary); }
.npr-task-ring { display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.npr-task-num { flex: none; color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.npr-task-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.npr-task-state {
  flex: none; margin-left: auto; padding-left: 8px;
  color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11);
}
.npr-task-meta {
  flex: none; margin-left: auto; padding-left: 8px;
  color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); white-space: nowrap;
}
.npr-job[data-status="failed"] .npr-task-text,
.npr-job[data-status="killed"] .npr-task-text { color: var(--dsw-alias-state-error-primary); }

@media (prefers-reduced-motion: reduce) {
  .npr-progress-fill { transition: none; }
}
`
