/** Progress workbench styles. Only layout glue lives here: colors/density
 *  come from host `--dsw-alias-*` tokens; controls come from ui-primitives.
 *  Prefix `npr-`; the root marker is `data-nano-progress-report="1"`. */
export const PROGRESS_CSS = `

[data-nano-progress-report] {
  height: 100%; display: flex; flex-direction: column; min-height: 0;
  color: var(--dsw-alias-label-primary); font-size: 12px;
  background: var(--dsw-alias-bg-layer-1, transparent);
}

.npr-head {
  flex: none; display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 10px 12px 8px; border-bottom: 1px solid var(--dsw-alias-border-l3);
}
.npr-head-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.npr-head-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.npr-head-state { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.npr-head-actions { flex: none; display: flex; gap: 4px; }

.npr-filter {
  flex: none; display: flex; align-items: center; gap: 6px; padding: 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l3);
}
.npr-filter-input { flex: 1; min-width: 0; }
.npr-filter-chips { flex: none; display: flex; gap: 4px; flex-wrap: wrap; }
.npr-filter-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px;
  border-radius: 999px; font-size: 11px;
  background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,.12));
  color: var(--dsw-alias-label-secondary);
}
.npr-filter-chip[data-neg="true"] { text-decoration: line-through; opacity: .7; }

.npr-flow { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 4px 0 8px; }
.npr-load-older {
  display: block; width: calc(100% - 24px); margin: 6px 12px; padding: 6px 0;
  text-align: center; color: var(--dsw-alias-label-secondary);
  border: 1px dashed var(--dsw-alias-border-l2); border-radius: 8px;
}
.npr-empty { padding: 24px 16px; text-align: center; color: var(--dsw-alias-label-tertiary); }

.npr-row {
  display: flex; align-items: flex-start; gap: 8px; padding: 5px 12px;
  border-left: 2px solid transparent;
}
.npr-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.npr-row[data-status="failed"] { border-left-color: var(--dsw-alias-state-error-primary, #d33); }
.npr-row[data-status="running"] { border-left-color: var(--dsw-alias-state-business-primary, #3a7); }
.npr-row[data-status="awaiting"] { border-left-color: var(--dsw-alias-state-warn-primary, #c93); }
.npr-row-chevron {
  flex: none; width: 16px; height: 18px; display: inline-flex; align-items: center;
  justify-content: center;
}
.npr-row-chevron-spacer { visibility: hidden; }
.npr-row-icon {
  flex: none; width: 16px; height: 18px; display: inline-flex; align-items: center;
  justify-content: center; color: var(--dsw-alias-label-tertiary); font-size: 12px;
}
.npr-row-icon[data-type="shell"] { font-family: var(--dsh-font-family-code, monospace); }
.npr-row-body { flex: 1 1 auto; min-width: 0; }
.npr-row-summary {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px;
}
.npr-row[data-type="shell"] .npr-row-summary { font-family: var(--dsh-font-family-code, monospace); font-size: 11.5px; }
.npr-row-time { flex: none; margin-left: 8px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 18px; }
.npr-row[data-status="failed"] .npr-row-summary { color: var(--dsw-alias-state-error-primary, #d33); }

.npr-row-detail {
  margin: 4px 0 4px 24px; padding: 8px 10px; border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,.08));
  font-family: var(--dsh-font-family-code, monospace); font-size: 11px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word;
  max-height: 280px; overflow-y: auto;
  color: var(--dsw-alias-label-secondary);
}
.npr-row-detail .npr-detail-label { color: var(--dsw-alias-label-tertiary); }
.npr-subcalls { margin-top: 6px; border-top: 1px dashed var(--dsw-alias-border-l3); padding-top: 6px; }
.npr-subcall { display: flex; gap: 6px; align-items: baseline; }
.npr-subcall-name { color: var(--dsw-alias-label-tertiary); }
.npr-subcall[data-status="failed"] .npr-subcall-summary { color: var(--dsw-alias-state-error-primary, #d33); }

.npr-panel { flex: none; border-top: 1px solid var(--dsw-alias-border-l3); max-height: 40%; display: flex; flex-direction: column; }
.npr-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px 4px; flex: none;
}
.npr-panel-title { font-weight: 600; font-size: 12px; color: var(--dsw-alias-label-primary); }
.npr-panel-count { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.npr-panel-bar {
  height: 4px; border-radius: 2px; margin: 4px 12px 0;
  background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,.15)); overflow: hidden;
}
.npr-panel-bar-fill {
  height: 100%; border-radius: 2px; background: var(--dsw-alias-state-done-primary, #3a7);
  transition: width .2s ease;
}
.npr-panel-list { overflow-y: auto; padding: 4px 12px 10px; }
.npr-task {
  display: flex; align-items: baseline; gap: 7px; padding: 3px 0;
  font-size: 12px; color: var(--dsw-alias-label-primary);
}
.npr-task-dot { flex: none; width: 14px; color: var(--dsw-alias-label-tertiary); }
.npr-task[data-status="completed"] { color: var(--dsw-alias-label-tertiary); }
.npr-task[data-status="in_progress"] { color: var(--dsw-alias-label-primary); }
.npr-task-text { min-width: 0; overflow-wrap: anywhere; }

.npr-job { display: flex; align-items: baseline; gap: 7px; padding: 3px 0; font-size: 12px; }
.npr-job-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.npr-job-status { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.npr-job[data-status="failed"], .npr-job[data-status="killed"] { color: var(--dsw-alias-state-error-primary, #d33); }
.npr-job[data-status="running"] .npr-job-status { color: var(--dsw-alias-state-business-primary, #3a7); }

`;
