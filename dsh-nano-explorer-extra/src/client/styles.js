/** Every style the explorer adds. Colors come from --dsw-* tokens; the Git palette is this plugin's own. */

import { NANO_STYLES } from 'dsh-nano-ui'

export const STYLE = `${NANO_STYLES}

[data-nxe] {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  /* The sidebar inherits the shell's 16px body size; a file tree reads at the shipped 13px scale. */
  font-size: 13px; line-height: 18px;
  /* Anchors the transient confirmation, which is taken out of the flow below. */
  position: relative;
}
[data-nxe] .nxe-tree button { font-size: 13px; line-height: 18px; }
[data-nxe] .nxe-tree [data-files-path] { font-size: 13px; }

/* Git status palette: DSH has no Git semantic colors, so this plugin owns them,
   with a separately tuned value per theme rather than one value at two opacities. */
[data-nxe] {
  --nxe-git-modified: #bf8700;
  --nxe-git-added: #1a7f37;
  --nxe-git-deleted: #cf222e;
  --nxe-git-renamed: #0969da;
  --nxe-git-conflicted: #bc4c00;
  --nxe-git-untracked: #1a7f37;
  --nxe-ignored-ink: #6a6f76;
}
[data-nxe][data-nano-scheme="dark"] {
  --nxe-git-modified: #d9a63b;
  --nxe-git-added: #4ac26b;
  --nxe-git-deleted: #f85149;
  --nxe-git-renamed: #58a6ff;
  --nxe-git-conflicted: #f0883e;
  --nxe-git-untracked: #3fb950;
  --nxe-ignored-ink: #9aa0a8;
}

.nxe-header {
  display: flex; align-items: center; gap: 4px;
  /* The shipped files page insets its header by 16px left and 6px right; the tree and the status bar
     below reuse the same pair so the tab, the path, the rows, and the footer share one left edge. */
  padding: 6px 8px 6px 16px; border-bottom: .5px solid var(--dsw-alias-border-l2);
  /* The shell draws the pane divider 76px from the top: 38px tab strip plus a 38px header. At the
     natural 36.5px this rule's bottom border sat 1.5px above that line whenever a file was only
     selected, and the split visibly broke; pinning the box to the same 38px keeps both edges on
     one line in every pane state. */
  box-sizing: border-box; min-height: 38px;
}
.nxe-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-tool { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nxe-tool:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nxe-tool:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

.nxe-tree { flex: 1; min-height: 0; overflow: auto; padding: 4px 8px 4px 16px; }
.nxe-tree [data-custom-tree] { height: auto; }

.nxe-row-note { padding: 8px 12px; font-size: 12px; color: var(--dsw-alias-label-secondary); }

/* Row decorations injected through the tree Factory's accessory seat. */
.nxe-acc {
  /* One fixed 14px cell at the right of the rail, not an auto-width group. An auto-width group was
     centred in the 24px seat, so a row with two marks (a symlink glyph plus the ignored close-circle)
     grew to 32px, shifted right by half the growth, and put its last mark 9px off the single-mark
     rows. Anchoring the rail to a fixed cell keeps the rightmost mark on one vertical line; any
     extra marks overflow to the left, into the row's slack, instead of pushing it sideways. */
  display: inline-flex; align-items: center; justify-content: flex-end;
  box-sizing: border-box; width: 14px; min-width: 14px; flex: 0 0 14px; gap: 4px;
}
.nxe-acc-letter {
  box-sizing: border-box; width: 14px; height: 14px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 650; line-height: 14px; letter-spacing: 0;
  padding: 0; margin: 0; text-align: center; white-space: nowrap;
}
/* The mark column is fixed by the letter rule below; this selector only keeps the colour hooks. */
.nxe-acc-letter[data-nxe-status] { text-align: right; }
.nxe-acc-letter[data-nxe-status="M"] { color: var(--nxe-git-modified); }
.nxe-acc-letter[data-nxe-status="A"] { color: var(--nxe-git-added); }
.nxe-acc-letter[data-nxe-status="D"] { color: var(--nxe-git-deleted); }
.nxe-acc-letter[data-nxe-status="R"] { color: var(--nxe-git-renamed); }
.nxe-acc-letter[data-nxe-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-acc-letter[data-nxe-status="?"] { color: var(--nxe-git-untracked); }
.nxe-acc-link {
  box-sizing: border-box; width: 14px; height: 14px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--dsw-alias-label-tertiary);
}
.nxe-acc-link svg, .nxe-acc-ignored-letter svg { width: 14px; height: 14px; flex: none; }
.nxe-open { display: none; }
[data-nxe-hover] .nxe-open, [data-nxe-focus] .nxe-open { display: inline-flex; }

/* Status bar: the composer's metadata line is the reference for size, line height, ink and padding. */
.nxe-status {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  /* No separator rule: the composer footer reads as a quiet row under the content, not a bordered
     strip, and the tree above already ends with its own inset. The block padding gives the row the
     same clearance from the panel edge that the composer gives its metadata line. */
  box-sizing: border-box; padding: 4px 8px 6px 16px;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
  color: var(--dsw-alias-label-tertiary);
}
.nxe-status-left { display: flex; align-items: center; gap: 6px; min-width: 0; }
.nxe-status-right { display: flex; align-items: center; gap: 10px; min-width: 0; }
.nxe-status-right { font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }

/* The footer follows the composer's own statistics row verbatim, so the two read as one surface:
   same size, same line box, same glyph box, same padding, same tertiary ink. Every value below is
   copied from the shipped StatsPills stylesheet rather than chosen here. */
.nxe-status, .nxe-status-left, .nxe-status-right {
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
}
.nxe-chip, .nxe-figure {
  display: inline-flex; align-items: center; gap: 6px;
  box-sizing: border-box; max-width: 100%;
  border: none; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-tertiary);
  font: inherit; font-variant-numeric: tabular-nums; line-height: inherit; white-space: nowrap;
}
/* A chip is pressable, so it keeps the pill's side padding as a hit area. A figure is read, not
   pressed, and eight pixels beside every number stacked into the gaps this row showed. */
.nxe-chip { padding: 1px 8px; }
.nxe-figure { padding: 1px 0; }
.nxe-chip svg, .nxe-figure svg { width: 14px; height: 14px; flex: none; }
.nxe-chip-label, .nxe-figure-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.nxe-chip[data-nxe-git="none"] { color: var(--dsw-alias-label-tertiary); }
.nxe-chip-button { cursor: pointer; }
@media (hover: hover) {
  .nxe-chip-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
}
.nxe-chip-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }
/* The two flags a reader scans for: uncommitted work, and an unresolved merge. Both sit inside the
   line box, so they inherit the same size as every other mark in this row. */
.nxe-chip-flag { font-weight: 700; }
.nxe-chip-flag[data-kind="dirty"] { color: var(--nxe-git-modified); }
.nxe-chip-flag[data-kind="conflict"] { color: var(--dsw-alias-state-error-primary); }
.nxe-chip-static { cursor: default; }
.nxe-chip-count { font-variant-numeric: tabular-nums; }
.nxe-chip-sync { font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }
/* Pending-file count: a filled badge, set off from the bare sync figures like an editor's
   status-bar badge — the fill is the delimiter, so the chip reads as sync pair, then count. */
.nxe-chip-badge {
  display: inline-flex; align-items: center; justify-content: center;
  box-sizing: border-box; min-width: 18px; height: 16px; padding: 0 5px; margin-left: 2px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 2px); font-weight: 600;
  font-variant-numeric: tabular-nums; line-height: 1;
}
.nxe-chip-badge[data-empty="true"] { font-weight: 400; color: var(--dsw-alias-label-tertiary); }

/* Drawer contents: the two lists. */
.nxe-drawer-heading {
  margin: 14px 0 6px; font-size: 12px; font-weight: 600;
  color: var(--dsw-alias-label-tertiary); text-transform: none;
}
.nxe-drawer-empty { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.nxe-drawer-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; }
.nxe-drawer-row {
  display: flex; align-items: center; gap: 8px;
  padding: 3px 6px; border-radius: var(--dsw-radius-sm); font-size: 12px; line-height: 18px;
}
.nxe-drawer-row[data-current="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-drawer-row-path { flex: 0 0 auto; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.nxe-change-status[data-nxe-status="M"] { color: var(--nxe-git-modified); }
.nxe-change-status[data-nxe-status="A"], .nxe-change-status[data-nxe-status="?"] { color: var(--nxe-git-added); }
.nxe-change-status[data-nxe-status="D"] { color: var(--nxe-git-deleted); }
.nxe-change-status[data-nxe-status="R"] { color: var(--nxe-git-renamed); }
.nxe-change-status[data-nxe-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-drawer-link {
  flex: 1; min-width: 0; text-align: left; border: 0; background: transparent; padding: 0;
  color: var(--dsw-alias-state-error-primary); font: inherit; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nxe-conflict-block { margin-top: 4px; }
.nxe-retry {
  border: 0; background: transparent; color: var(--dsw-alias-link); cursor: pointer;
  font: inherit; font-variant-numeric: tabular-nums; padding: 1px 8px; border-radius: var(--dsw-radius-sm);
}

/* Dialog body: the card material, the mask and the action row all come from the shared dialog. */
.nxe-dialog-body { display: contents; }
.nxe-dialog-note-inline { color: var(--dsw-alias-label-tertiary); }
.nxe-move-countdown { margin: 8px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog-error { margin: 8px 0 0; font-size: 12px; color: var(--dsw-alias-state-error-primary); }
.nxe-dialog-changed { margin: 6px 0 0; padding: 0; list-style: none; max-height: 120px; overflow: auto; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog-changed li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Settings page. */
.nxe-settings-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
.nxe-settings-row:last-child { border-bottom: 0; }
.nxe-settings-label { font-size: 13px; color: var(--dsw-alias-label-primary); }
.nxe-settings-hint { margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.nxe-warn { margin: 0; padding: 8px; border: .5px solid var(--dsw-alias-state-warn-primary); border-radius: var(--dsw-radius-sm); font-size: 12px; color: var(--dsw-alias-label-secondary); }

@media (hover: hover) {
  .nxe-tree [data-custom-tree] button:hover .nxe-open { display: inline-flex; }
}

/* A changed row cannot be tinted from here: the shared tree owns its row markup and hands the
   plugin only the accessory seat, so the marks below carry the status (DESIGN.md §8). */

/* A folder's summary dot: present whenever anything below it changed, visible while collapsed. */
.nxe-acc-dot {
  box-sizing: border-box; width: 14px; height: 14px; flex: none; margin: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border-radius: 0;
}
.nxe-acc-dot::after {
  content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor;
}
.nxe-acc-dot[data-nxe-status="M"] { color: var(--nxe-git-modified); }
.nxe-acc-dot[data-nxe-status="A"] { color: var(--nxe-git-added); }
.nxe-acc-dot[data-nxe-status="D"] { color: var(--nxe-git-deleted); }
.nxe-acc-dot[data-nxe-status="R"] { color: var(--nxe-git-renamed); }
.nxe-acc-dot[data-nxe-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-acc-dot[data-nxe-status="?"] { color: var(--nxe-git-untracked); }
.nxe-acc-dot { corner-shape: round; }

/* Persistent Git warning. It stays until a read succeeds or the reader dismisses it, which the
   host Toast cannot express, so the surface is this plugin's own: it floats over the status bar
   instead of shifting a row.
   nano-ui-exempt: the host Toast ends at holdMs and cannot stay until dismissed. */
.nxe-git-alert {
  position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%);
  z-index: var(--nano-layer-overlay);
  display: flex; align-items: center; gap: 6px;
  width: max-content; max-width: min(440px, calc(100% - 32px));
  padding: 6px 8px 6px 10px;
  border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-prominent);
  color: var(--dsw-alias-label-primary);
}
.nxe-git-alert-icon { flex: none; color: var(--nxe-git-conflicted); }
.nxe-git-alert-text { flex: 1; min-width: 0; white-space: normal; text-align: left; }
.nxe-git-alert-x {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer;
}
.nxe-git-alert-x:hover { background: color-mix(in oklab, currentColor 14%, transparent); color: var(--dsw-alias-label-primary); }
.nxe-git-alert-x:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

/* The modal's own chrome comes from the shell; this only sets the gap between the body and its
   field, matching how the shipped dialogs compose theirs. */
.nxe-dialog-field { display: flex; flex-direction: column; gap: 8px; }

/* The reveal control mirrors the shipped split button: an application icon, a hairline divider, and a
   chevron, all inside one outlined pill. Geometry follows the shell's toolbar buttons. */
.nxe-reveal {
  position: relative; display: inline-flex; align-items: stretch;
  height: 22px; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md); overflow: visible;
  background: transparent;
}
.nxe-reveal:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-reveal-main, .nxe-reveal-more {
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: transparent; padding: 0 4px; cursor: pointer;
  color: var(--dsw-alias-label-secondary);
}
.nxe-reveal-main { padding-left: 6px; }
.nxe-reveal-main img { display: block; }
.nxe-reveal-more { padding-right: 5px; padding-left: 3px; }
.nxe-reveal-divider { width: 1px; align-self: center; height: 12px; background: var(--dsw-alias-border-l2); }
.nxe-reveal-main:focus-visible, .nxe-reveal-more:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px;
}

/* The chip's folder sheet sits inline before the label, exactly as the builtin draws it. */
.nxe-title-icon { flex: none; }

/* Remote divergence: a two-character mark (arrow plus letter) that says the other side of the
   upstream changed this path. It sits left of the local letter and reads as metadata, not as a
   second status. */
.nxe-acc-remote {
  box-sizing: border-box; height: 14px; min-width: 14px; flex: none;
  font-size: 11px; font-weight: 650; line-height: 14px; letter-spacing: 0;
  display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;
  color: var(--dsw-alias-label-tertiary); opacity: .95;
}
.nxe-acc-remote[data-direction="pulled"] { color: var(--dsw-alias-link, #2f81f7); }
.nxe-acc-remote[data-direction="pushed"] { color: var(--nxe-git-modified); }

/* A local letter that came through the index keeps full weight; one that lives only in the working
   tree is drawn lighter, so "already staged" is visible without a second glyph. */
.nxe-acc-letter[data-staged="false"] { opacity: .62; }

/* An ignored row's own mark, drawn where the status letter would be. */
.nxe-acc-ignored-letter {
  /* Same 14px cell and the same official icon size as the link mark. Quiet ink, not an alert. */
  box-sizing: border-box; width: 14px; height: 14px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--nxe-ignored-ink); opacity: .8;
}

/* Branch rows: the name is the control, the trailing badge explains why a row is unavailable. */
.nxe-drawer-branch {
  flex: 1; min-width: 0; text-align: left; border: 0; background: transparent; padding: 0;
  color: var(--dsw-alias-label-primary); font: inherit; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nxe-drawer-branch:disabled { cursor: default; }
.nxe-drawer-row[data-current="true"] .nxe-drawer-branch { font-weight: 600; }
.nxe-drawer-row[data-blocked="true"] .nxe-drawer-branch { color: var(--dsw-alias-label-tertiary); }
.nxe-drawer-branch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }
.nxe-drawer-row-badge {
  flex: 0 0 auto; font-size: 10px; line-height: 1; padding: 2px 5px;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-interactive-bg-hover);
}
.nxe-drawer-row-badge[data-tone="current"] { color: var(--nxe-git-added); }

/* The footer gear: one icon-sized control at the end of the row, matching the figures' line box. */
.nxe-gear {
  display: inline-flex; align-items: center; justify-content: center;
  box-sizing: border-box; width: 22px; height: 20px; padding: 0;
  border: none; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer;
  flex: none;
}
.nxe-gear svg { width: 14px; height: 14px; flex: none; }
@media (hover: hover) {
  .nxe-gear:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
}
.nxe-gear:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

/* Source-control cards. The Git palette normally lives on [data-nxe], but these cards are portaled
   outside that subtree, so they carry the same variables. The confinement layer copies
   data-nano-scheme onto the card, which selects the dark set. */
.nxe-scm {
  display: flex; flex-direction: column; gap: 8px; min-width: 0;
  --nxe-git-modified: #bf8700;
  --nxe-git-added: #1a7f37;
  --nxe-git-deleted: #cf222e;
  --nxe-git-renamed: #0969da;
  --nxe-git-conflicted: #bc4c00;
  --nxe-git-untracked: #1a7f37;
}
[data-nano-scheme="dark"] .nxe-scm {
  --nxe-git-modified: #d9a63b;
  --nxe-git-added: #4ac26b;
  --nxe-git-deleted: #f85149;
  --nxe-git-renamed: #58a6ff;
  --nxe-git-conflicted: #f0883e;
  --nxe-git-untracked: #3fb950;
}
.nxe-scm-group { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nxe-local-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin: 10px 0 2px; font-size: 11px; font-weight: 600; line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
.nxe-local-badge {
  flex: none; min-width: 1.4em; padding: 0 6px; border-radius: 999px;
  font-size: 11px; line-height: 16px; text-align: center; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover);
}
.nxe-local-head[data-tone="danger"] { color: var(--dsw-alias-state-error-primary); }
.nxe-local-head[data-tone="danger"] .nxe-local-badge {
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in oklab, var(--dsw-alias-state-error-primary) 16%, transparent);
}
.nxe-repo .nxe-graph { max-height: 220px; overflow: auto; }
/* The two branch tabs share one pane: the 9-row local list and the 2-row remote list must not
   resize it on every switch, so the pane holds a fixed height and scrolls inside. */
.nxe-branch-pane {
  display: flex; flex-direction: column; gap: 4px;
  min-height: 216px; max-height: 216px; overflow-y: auto; overflow-x: hidden;
}
.nxe-repo-conflict {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px; border-radius: var(--dsw-radius-sm);
  background: color-mix(in oklab, var(--dsw-alias-state-error-primary) 14%, transparent);
}
.nxe-repo-conflict-title {
  margin: 0; font-size: 12px; font-weight: 600; line-height: 18px;
  color: var(--dsw-alias-state-error-primary);
}
.nxe-repo-conflict-list { max-height: 120px; overflow: auto; }
.nxe-drawer-row-badge[data-tone="danger"] { color: var(--dsw-alias-state-error-primary); }
.nxe-drawer-title { display: inline-flex; align-items: center; gap: 8px; }
.nxe-drawer-spin { color: var(--dsw-alias-label-tertiary); animation: nxe-spin 0.9s linear infinite; }
@keyframes nxe-spin { to { transform: rotate(360deg); } }
.nxe-change {
  display: grid; grid-template-columns: 14px 16px minmax(0, 1fr); gap: 6px; align-items: baseline;
  min-height: 20px; padding: 1px 4px; border-radius: var(--dsw-radius-sm);
  font-size: 12px; line-height: 18px;
}
.nxe-change-status {
  font-weight: 700; text-align: center; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}
/* Match the official file tree (.fileIcon sets no color): let the badge inherit the primary
   label tone so single-tone marks like "MD" stay readable at 16px. */
.nxe-change-icon { align-self: center; color: var(--dsw-alias-label-primary); }
/* A folder catching a dragged row lights up like a drop target should: the hover fill plus a ring
   that reads as a boundary, not as selection. The container itself wears the same ring with a
   larger radius, so dropping onto empty space reads as the workspace root. */
.nxe-tree [data-nxe-drop="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, var(--dsw-alias-link)) inset;
  border-radius: var(--dsw-radius-sm);
}
.nxe-tree[data-nxe-drop="true"] { border-radius: var(--dsw-radius-md, var(--dsw-radius-sm)); }
.nxe-change-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nxe-change-dir { margin-left: 8px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.nxe-graph { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.nxe-graph-row {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center; gap: 6px; min-height: 22px;
}
.nxe-graph-rail { display: block; flex: none; }
/* Lane palette: the VS Code git-graph hues. Eight colours so concurrent lanes never share ink
   unless the history is wider than eight branches; the class cycles with the lane's colour index. */
.nxe-lane { stroke-width: 1.6px; fill: none; }
.nxe-lane[data-dot="true"] { fill: currentColor; stroke: none; }
.nxe-c0 { color: #4ea1ff; stroke: #4ea1ff; }
.nxe-c1 { color: #f9a03f; stroke: #f9a03f; }
.nxe-c2 { color: #3fd68b; stroke: #3fd68b; }
.nxe-c3 { color: #f16d75; stroke: #f16d75; }
.nxe-c4 { color: #b180d7; stroke: #b180d7; }
.nxe-c5 { color: #4ec9b0; stroke: #4ec9b0; }
.nxe-c6 { color: #dcdcaa; stroke: #dcdcaa; }
.nxe-c7 { color: #f78c6c; stroke: #f78c6c; }
/* Pushed work keeps the lane's hue but drops to a low-contrast stroke: the bright stretch at the
   top of a lane is exactly the part that has not left this machine, and its height is the count
   the push button reports. */
.nxe-lane[data-dim="true"] { opacity: .32; }
.nxe-lane[data-dim="false"] { opacity: 1; }
.nxe-graph-row[data-ahead="true"] .nxe-graph-subject { color: var(--dsw-alias-label-primary); font-weight: 600; }
.nxe-graph-row[data-pushed="true"] .nxe-graph-subject { color: var(--dsw-alias-label-tertiary); }
.nxe-pill[data-tone="upstream"] {
  color: var(--dsw-alias-link, var(--dsw-alias-label-secondary));
  background: color-mix(in oklab, var(--dsw-alias-link, #2f81f7) 14%, transparent);
}
.nxe-graph-subject {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary);
}
.nxe-graph-hash {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.nxe-graph-pills { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.nxe-pill {
  max-width: 108px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 0 6px; border-radius: 999px; font-size: 10px; line-height: 16px;
  color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover);
}
.nxe-pill[data-tone="current"] {
  color: var(--dsw-alias-label-primary);
  background: color-mix(in oklab, var(--dsw-alias-brand-primary, var(--dsw-alias-link)) 22%, transparent);
}
/* The footer's dismissal parks at the left edge; the margin pushes the working actions right. */
.nano-dialog-card .nxe-drawer-close { margin-right: auto; }
.nxe-worktree {
  display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 6px; align-items: start;
  padding: 3px 4px; border-radius: var(--dsw-radius-sm);
}
.nxe-worktree[data-current="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-worktree-mark {
  width: 7px; height: 7px; margin-top: 6px; margin-left: 3px; border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.nxe-worktree-mark[data-current="true"] { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); }
.nxe-worktree-body { min-width: 0; display: flex; flex-direction: column; }
.nxe-worktree-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.nxe-worktree-branch {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary);
}
.nxe-worktree[data-current="true"] .nxe-worktree-branch { font-weight: 600; }
.nxe-worktree-path {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary);
}
.nxe-remote-row {
  display: grid; grid-template-columns: 64px minmax(0, 1fr) auto auto;
  align-items: center; gap: 6px; padding: 8px 0;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.nxe-remote-row:first-child { border-top: 0; }
.nxe-remote-name {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary);
}
/* Settings card: one topic per tab, one row per fact, a hairline between rows.
   Inputs never share a row with an action — the path field used to lose its width to the Bind button. */
.nxe-repo-settings { display: flex; flex-direction: column; gap: 8px; min-width: 0; min-height: 220px; }
.nxe-repo-panel { display: flex; flex-direction: column; gap: 0; min-width: 0; }
.nxe-set-row {
  display: flex; flex-direction: column; gap: 6px; min-width: 0;
  padding: 10px 0; border-top: 1px solid var(--dsw-alias-border-l2);
}
.nxe-set-row:first-child { border-top: 0; padding-top: 2px; }
.nxe-set-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nxe-set-name { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); }
.nxe-set-desc { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.nxe-set-actions { display: flex; justify-content: flex-end; gap: 6px; }
.nxe-set-pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6px; }
.nxe-ssh-command {
  margin: 0; font-family: var(--dsw-font-markdown-code-font-family, ui-monospace, monospace);
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary);
  word-break: break-all;
}
.nxe-dialog-error {
  margin: 4px 0 0; font-size: 11px; line-height: 16px;
  color: var(--dsw-alias-state-error-primary);
}
.nxe-confined-layer .nano-dialog-content { scrollbar-width: thin; scrollbar-color: var(--dsw-alias-border-l2) transparent; }
`
