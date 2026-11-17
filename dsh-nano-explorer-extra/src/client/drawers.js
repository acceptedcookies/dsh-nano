/** The two footer panels. They are not two sizes of the same card.
 *
 * The commit panel is the working tree: which paths are staged, unstaged, untracked, or in conflict.
 * The branch panel is the repository: the history graph, the branch you can switch to, and every
 * worktree on this machine. Pull lives only on the second, because it is a remote action.
 */

import React from 'react'
import { Button, FileTypeIcon, IconLoadingOutlineRegular, IconRightUpOutlineRegular, Input, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoWindowDialog } from 'dsh-nano-ui'
import { Dialog, useDialogContainer } from './dialogs.js'
import { ageParts, partitionChanges, shortenPath, splitPath } from './format.js'

const { useEffect, useState } = React

/**
 * Name a commit's age in the active language.
 * @param copy - the language table.
 * @param unixSeconds - commit time.
 * @returns the relative label, or an empty string when the time is missing.
 */
function ageLabel(copy, unixSeconds) {
  const age = ageParts(unixSeconds)
  if (age.unit === 'now') return copy.ageJustNow
  if (age.unit === 'minutes') return copy.ageMinutes(age.value)
  if (age.unit === 'hours') return copy.ageHours(age.value)
  if (age.unit === 'days') return copy.ageDays(age.value)
  if (age.unit === 'date') return age.value
  return ''
}

/**
 * The branch this checkout is on, or null while detached or unknown.
 * @param git - the status payload.
 * @returns the branch name.
 */
function branchName(git) {
  if (git?.detached === true) return null
  return typeof git?.branch === 'string' && git.branch !== '' ? git.branch : null
}

/**
 * @param query - the filter box.
 * @param fields - values that may match it.
 * @returns whether the row should stay.
 */
function matches(query, fields) {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return fields.some(field => String(field ?? '').toLowerCase().includes(needle))
}

/**
 * One changed path: the status letter, the file name, and the directory it lives in.
 * @param props - the status entry.
 * @returns the row.
 */
function ChangeRow({ file, selected, onSelect, onOpen, openLabel }) {
  const { name, dir } = splitPath(file.path)
  const additions = Number(file.additions)
  const deletions = Number(file.deletions)
  return React.createElement('li', {
    className: 'nxe-change', 'data-nxe-status': file.status, 'data-selected': String(selected === true), title: file.path,
  },
  React.createElement('span', { className: 'nxe-change-status', 'data-nxe-status': file.status }, file.status),
  React.createElement(FileTypeIcon, { path: name, size: 16, className: 'nxe-change-icon' }),
  React.createElement('button', {
    type: 'button', className: 'nxe-change-name',
    onClick: () => onSelect(file),
  },
  name,
  dir === '' ? null : React.createElement('span', { className: 'nxe-change-dir' }, dir)),
  React.createElement('span', { className: 'nxe-graph-stat' },
    Number.isFinite(additions) && additions > 0 ? React.createElement('span', { 'data-tone': 'add' }, `+${additions}`) : null,
    Number.isFinite(deletions) && deletions > 0 ? React.createElement('span', { 'data-tone': 'del' }, `−${deletions}`) : null),
  React.createElement('button', {
    type: 'button', className: 'nxe-change-open', title: openLabel, 'aria-label': openLabel,
    onClick: event => { event.stopPropagation(); onOpen(file.path) },
  }, React.createElement(IconRightUpOutlineRegular, { width: 12, height: 12, 'aria-hidden': 'true' })))
}

/**
 * One group of changes. Absent when the group is empty, so a clean side does not leave a heading.
 * @param props - the heading and the rows.
 * @returns the section, or null.
 */
function ChangeGroup({ label, count, files, tone, selected, onSelect, onOpen, openLabel }) {
  if (files.length === 0) return null
  return React.createElement('section', { className: 'nxe-scm-group', 'data-tone': tone ?? 'default' },
    React.createElement('h3', { className: 'nxe-local-head', 'data-tone': tone ?? 'default' },
      React.createElement('span', null, label),
      React.createElement('span', { className: 'nxe-local-badge' }, String(count))),
    React.createElement('ul', { className: 'nxe-drawer-list' }, files.slice(0, 400).map(file =>
      React.createElement(ChangeRow, {
        key: `${tone ?? ''}:${file.path}`, file, selected: selected === file.path,
        onSelect, onOpen, openLabel,
      }))))
}

/* The lane palette mirrors the VS Code git-graph one: eight hues, so lanes that appear together
 * never share a colour unless the history is wider than eight concurrent branches. */
const LANE_COLORS = 8

/** Geometry of one graph row: a 22px tall canvas, lanes 10px apart starting at x=6. */
const ROW_H = 22
const LANE_W = 10
const LANE_X = 6

/**
 * Assign every commit to a lane column and collect the strokes each row has to draw.
 *
 * This is the same sweep VS Code's source-control graph and `git log --graph` share: a lane keeps
 * the hash it is waiting for; when that commit appears the lane delivers it onto a column and
 * forwards its first parent. A commit no lane expected is a new tip and takes the first free
 * column. Each lane also remembers whether the last commit it delivered was already pushed, so
 * its stroke can dim the moment its work reached a remote.
 *
 * @param commits - newest-first history with `{ full, parents }`.
 * @param isPushed - whether a full hash is already on a remote.
 * @returns `{ rows, lanesWide }`; each row carries `col` (its column), `color` (its hue),
 *   `enter`/`exit` (Map col → `{ color, dim }` for lanes alive above/below the row), and `edges`
 *   (`{ to, color, dim }` curves from this dot toward a parent's lane).
 */
function layoutGraph(commits, isPushed) {
  // A lane is `{ hash, color, dim }`: the commit it waits for, the hue it owns, and whether the
  // commit that most recently sat on it was already pushed. `null` marks a freed column.
  const lanes = []
  const rows = []

  const snapshot = () => {
    const map = new Map()
    for (let c = 0; c < lanes.length; c += 1) {
      if (lanes[c] !== null) map.set(c, { color: lanes[c].color, dim: lanes[c].dim })
    }
    return map
  }
  const freeColumn = () => {
    const free = lanes.indexOf(null)
    if (free !== -1) return free
    lanes.push(null)
    return lanes.length - 1
  }
  const freshColor = () => {
    let next = 0
    for (const lane of lanes) if (lane !== null) next = Math.max(next, lane.color + 1)
    return next
  }

  for (let i = 0; i < commits.length; i += 1) {
    const commit = commits[i]
    const pushed = isPushed(commit.full)
    // Lanes alive above this row, before it delivers or spawns anything.
    const enter = snapshot()

    const hits = []
    for (let c = 0; c < lanes.length; c += 1) {
      if (lanes[c] !== null && lanes[c].hash === commit.full) hits.push(c)
    }
    let col
    let color
    if (hits.length === 0) {
      col = freeColumn()
      color = freshColor()
      // A tip that was not drawn on the first row: give the waiting lane its own entry so the dot
      // has a column on record. Nothing arrives from above, so `enter` stays untouched.
      lanes[col] = { hash: commit.full, color, dim: pushed }
    } else {
      col = hits[0]
      color = lanes[col].color
    }
    // Extra lanes that also waited for this commit terminate into it — the merge curves.
    for (const c of hits.slice(1)) lanes[c] = null

    const edges = []
    const parents = commit.parents ?? []
    if (parents.length === 0) {
      lanes[col] = null
    } else {
      for (let pi = 0; pi < parents.length; pi += 1) {
        const parent = parents[pi]
        let target = -1
        for (let c = 0; c < lanes.length; c += 1) {
          if (lanes[c] !== null && lanes[c].hash === parent) { target = c; break }
        }
        if (pi === 0 && target === -1) {
          // The lane continues straight through this commit onto its first parent; the segment
          // below it keeps this commit's pushed state, which is what the dim answers.
          lanes[col] = { hash: parent, color, dim: pushed }
        } else {
          const toCol = target !== -1 ? target : freeColumn()
          if (target === -1) {
            const toColor = freshColor()
            lanes[toCol] = { hash: parent, color: toColor, dim: pushed }
            edges.push({ to: toCol, color: toColor, dim: pushed })
          } else {
            edges.push({ to: toCol, color: lanes[toCol].color, dim: pushed })
          }
        }
      }
    }
    rows.push({ commit, col, color, enter, exit: snapshot(), edges })
  }
  return { rows, lanesWide: lanes.length }
}

/**
 * The commit graph: one lane stroke per concurrent line of history, one hue per lane.
 *
 * Pushed work keeps the lane's hue but drops to a dim stroke — the lane still reads as the same
 * line, while the stretch that only exists locally is the bright part and its height IS the amount
 * not yet pushed. `ahead` (unpushed AND an ancestor of HEAD) additionally darkens the subject,
 * which is the set the push button acts on.
 * @param props - copy, the history payload, and the ref names that matter.
 * @returns the graph section.
 */
function HistoryRail({ copy, history, currentBranch, upstream, remotes }) {
  const commits = history ?? []
  // Pushed: reachable from any remote-tracking ref. Ahead: reachable from the current branch's
  // tip but not pushed. Both are small ancestor walks over the same parent map the lanes used.
  const { pushedSet, aheadSet } = React.useMemo(() => {
    const byFull = new Map(commits.map(commit => [commit.full, commit]))
    const mark = seeds => {
      const seen = new Set()
      const queue = seeds.filter(Boolean)
      while (queue.length > 0) {
        const full = queue.pop()
        if (seen.has(full) || !byFull.has(full)) continue
        seen.add(full)
        for (const parent of byFull.get(full).parents ?? []) queue.push(parent)
      }
      return seen
    }
    // A ref is remote-tracking when it starts with a configured remote's name; a repo without
    // remotes falls back to any `x/y` ref so detached mirror refs still mark the pushed region.
    const remoteNames = (remotes ?? []).map(remote => remote.name)
    const isRemoteRef = ref => remoteNames.length === 0
      ? ref.includes('/')
      : remoteNames.some(name => ref.startsWith(`${name}/`))
    const remoteTips = commits
      .filter(commit => commit.refs.some(isRemoteRef))
      .map(commit => commit.full)
    const pushed = mark(remoteTips)
    const headTip = commits.find(commit => currentBranch !== null && commit.refs.includes(currentBranch))
    const ahead = mark(headTip === undefined ? [] : [headTip.full])
    return { pushedSet: pushed, aheadSet: ahead }
  }, [commits, currentBranch, remotes])
  const layout = React.useMemo(
    () => layoutGraph(commits, full => pushedSet.has(full)),
    [commits, pushedSet],
  )

  const graphW = Math.max(1, layout.lanesWide) * LANE_W + LANE_X * 2
  const xOf = c => LANE_X + c * LANE_W
  // The open commit defaults to the tip. Clicking another row swaps the file list
  // underneath; the list itself is a fixed-height scroller, so a large commit
  // does not resize the card.
  const [selected, setSelected] = useState(commits[0]?.full ?? '')
  const shown = commits.find(commit => commit.full === selected) ?? commits[0]
  return React.createElement('section', { className: 'nxe-scm-group', 'data-nxe-history': 'true' },
    React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.historyHeading),
    commits.length === 0
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.historyEmpty)
      : React.createElement('ol', { className: 'nxe-graph' }, layout.rows.map((row, index) => {
        const { commit } = row
        const pushed = pushedSet.has(commit.full)
        const ahead = aheadSet.has(commit.full) && !pushed
        const pieces = []
        // Lanes alive on both sides of the row run straight through. The column this commit leaves
        // on is skipped here: its upper half is drawn by the 'top' piece so the two halves can take
        // different dim values at the pushed boundary.
        for (const [c, lane] of row.enter) {
          if (!row.exit.has(c) || c === row.col) continue
          pieces.push(React.createElement('line', {
            key: `v${c}`, x1: xOf(c), y1: 0, x2: xOf(c), y2: ROW_H,
            className: `nxe-lane nxe-c${lane.color % LANE_COLORS}`,
            'data-dim': String(lane.dim && row.exit.get(c).dim),
          }))
        }
        // Lanes that end at this commit (merge-ins) curve down onto its dot.
        for (const [c, lane] of row.enter) {
          if (row.exit.has(c) || c === row.col) continue
          pieces.push(React.createElement('path', {
            key: `m${c}`,
            d: `M ${xOf(c)} 0 C ${xOf(c)} ${ROW_H * 0.55} ${xOf(row.col)} ${ROW_H * 0.45} ${xOf(row.col)} ${ROW_H / 2}`,
            className: `nxe-lane nxe-c${lane.color % LANE_COLORS}`,
            'data-dim': String(lane.dim),
          }))
        }
        // This commit's own lane arrives from above only when a lane was waiting for it; a brand-new
        // tip starts at its dot with no stroke above.
        if (row.enter.has(row.col)) {
          const lane = row.enter.get(row.col)
          pieces.push(React.createElement('line', {
            key: 'top', x1: xOf(row.col), y1: 0, x2: xOf(row.col), y2: ROW_H / 2,
            className: `nxe-lane nxe-c${lane.color % LANE_COLORS}`,
            'data-dim': String(lane.dim),
          }))
        }
        if (row.exit.has(row.col)) {
          const lane = row.exit.get(row.col)
          pieces.push(React.createElement('line', {
            key: 'bot', x1: xOf(row.col), y1: ROW_H / 2, x2: xOf(row.col), y2: ROW_H,
            className: `nxe-lane nxe-c${lane.color % LANE_COLORS}`,
            'data-dim': String(lane.dim),
          }))
        }
        // Edges out of this dot toward parents living in another column: curve down into that lane.
        for (let ei = 0; ei < row.edges.length; ei += 1) {
          const edge = row.edges[ei]
          pieces.push(React.createElement('path', {
            key: `e${ei}`,
            d: `M ${xOf(row.col)} ${ROW_H / 2} C ${xOf(row.col)} ${ROW_H * 0.95} ${xOf(edge.to)} ${ROW_H * 0.55} ${xOf(edge.to)} ${ROW_H}`,
            className: `nxe-lane nxe-c${edge.color % LANE_COLORS}`,
            'data-dim': String(edge.dim),
          }))
        }
        // The commit dot: full hue and a touch larger while local-only, dimmed and smaller once the
        // remote already holds it.
        pieces.push(React.createElement('circle', {
          key: 'dot', cx: xOf(row.col), cy: ROW_H / 2, r: pushed ? 2.6 : 3.4,
          className: `nxe-lane nxe-c${row.color % LANE_COLORS}`,
          'data-dim': String(pushed), 'data-dot': 'true',
        }))
        const refs = [...commit.refs].sort((a, b) => {
          if (a === currentBranch) return -1
          if (b === currentBranch) return 1
          return 0
        })
        return React.createElement('li', {
          key: `${commit.hash}:${index}`,
          className: 'nxe-graph-row',
          'data-head': String(index === 0),
          'data-pushed': String(pushed),
          'data-ahead': String(ahead),
          'data-selected': String(shown?.full === commit.full),
          title: [commit.hash, ageLabel(copy, commit.time), commit.subject].filter(part => part !== '').join(' · '),
          onClick: () => setSelected(commit.full),
          onKeyDown: event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(commit.full) }
          },
          tabIndex: 0,
          role: 'button',
        },
        React.createElement('svg', {
          className: 'nxe-graph-rail', 'aria-hidden': 'true',
          width: graphW, height: ROW_H, viewBox: `0 0 ${graphW} ${ROW_H}`,
        }, pieces),
        React.createElement('span', { className: 'nxe-graph-subject' },
          React.createElement('span', { className: 'nxe-graph-hash' }, commit.hash),
          ' ',
          commit.subject),
        React.createElement('span', { className: 'nxe-graph-stat', 'aria-hidden': commit.additions === 0 && commit.deletions === 0 },
          commit.additions > 0 ? React.createElement('span', { 'data-tone': 'add' }, `+${commit.additions}`) : null,
          commit.deletions > 0 ? React.createElement('span', { 'data-tone': 'del' }, `−${commit.deletions}`) : null),
        React.createElement('span', { className: 'nxe-graph-pills' }, refs.slice(0, 3).map(ref =>
          React.createElement('span', {
            key: ref,
            className: 'nxe-pill',
            'data-tone': ref === currentBranch ? 'current' : ref === upstream ? 'upstream' : 'default',
            title: ref,
          }, ref))))
      })),
    shown === undefined ? null : React.createElement('div', {
      className: 'nxe-commit-files', 'data-nxe-commit-files': shown.hash, role: 'region',
      'aria-label': shown.subject,
    },
    (shown.files ?? []).length === 0
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.commitFilesEmpty)
      : React.createElement('ul', { className: 'nxe-drawer-list' },
        shown.files.map(file => React.createElement('li', { key: file.path, className: 'nxe-commit-file' },
          React.createElement('span', { className: 'nxe-commit-file-path', title: file.path }, file.path),
          React.createElement('span', { className: 'nxe-graph-stat' },
            file.additions > 0 ? React.createElement('span', { 'data-tone': 'add' }, `+${file.additions}`) : null,
            file.deletions > 0 ? React.createElement('span', { 'data-tone': 'del' }, `−${file.deletions}`) : null)))),
    shown.filesTruncated === true
      ? React.createElement('p', { className: 'nxe-commit-more' }, copy.commitFilesMore)
      : null))
}

/**
 * The branch panel: switch inside this worktree, and see every other checkout.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function BranchDrawer({ copy, open, git, onClose, onPull, onPush, onRefresh, onCheckout, onOpenConflict, onRemote, onAuthor, onSshKey, busy, error }) {
  // The card is drawn inside this page's own layer (DESIGN.md §5), so it stays in the files panel.
  const container = useDialogContainer()
  const [query, setQuery] = useState('')
  const [branchTab, setBranchTab] = useState('local')
  const [pendingBranch, setPendingBranch] = useState(null)
  const [pendingRemote, setPendingRemote] = useState(null)
  // A first push needs a destination: the branch has no upstream yet, so the reader picks the
  // remote before anything leaves this machine. `false` = no dialog, a string = dialog choosing.
  const [pendingPush, setPendingPush] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    if (!open) { setQuery(''); setBranchTab('local'); setPendingBranch(null); setPendingRemote(null); setPendingPush(false); setSettingsOpen(false) }
  }, [open])
  if (!open || container === null) return null
  const current = branchName(git)
  const upstream = git?.upstream ?? null
  const behind = git?.behind ?? 0
  const ahead = git?.ahead ?? 0
  const remotes = git?.remotes ?? []
  const detached = git?.detached === true
  const history = git?.history ?? []
  const localNames = new Set((git?.branches ?? []).map(row => row.name))
  const branches = [...(git?.branches ?? [])].sort((a, b) => {
    if (a.current === true && b.current !== true) return -1
    if (b.current === true && a.current !== true) return 1
    return a.name.localeCompare(b.name)
  }).filter(row => matches(query, [row.name, row.upstream, row.commit]))
  // Remote-tracking refs are a snapshot of what each remote advertised at the last fetch, not a
  // live view: `fetchedAt` (the FETCH_HEAD mtime) tells the reader how old that snapshot is.
  const remoteBranches = [...(git?.remoteBranches ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)).filter(row => matches(query, [row.name, row.commit]))
  const worktrees = (git?.worktrees ?? []).filter(row => matches(query, [
    row.branch, row.path, row.head, shortenPath(row.path),
  ]))
  const fetchedAt = typeof git?.fetchedAt === 'number' ? git.fetchedAt : undefined
  const fetchStamp = fetchedAt === undefined ? copy.fetchNever : copy.fetchAgo(ageLabel(copy, fetchedAt / 1000))
  // The remote tab only exists when the repo names a remote at all; without one there is
  // nothing to fetch and nothing to track, so the tab would always be empty.
  const tab = remotes.length === 0 ? 'local' : branchTab
  const filteredOut = query.trim() !== '' && (
    tab === 'local' ? branches.length === 0 : remoteBranches.length === 0)
  const conflicts = git?.conflicts ?? []
  // Three surfaces with three different physical shapes get three labels in one line: the branch
  // is a ref on this worktree, the upstream is the remote ref it tracks, the stamp is how old
  // the remote snapshot is. Sync counts stay in the commit card where the reader acts on them.
  const checkedOut = branches.filter(row => row.current === true || row.inOtherWorktree === true)
  const refsOnly = branches.filter(row => row.current !== true && row.inOtherWorktree !== true)
  const summary = copy.branchDrawerSummary(
    current ?? copy.detached,
    upstream === null ? copy.noUpstream : upstream,
    copy.worktreesHeadingCount((git?.worktrees ?? []).length),
    remotes.length === 0 ? '' : fetchStamp,
  )
  return React.createElement(NanoWindowDialog, {
    container,
    // The repository card fills the pane's width and rises from its bottom edge (plugin-owned CSS).
    className: 'nxe-scm-card',
    copy,
    title: React.createElement('span', { className: 'nxe-drawer-title' },
      copy.branchDrawerTitle,
      busy === true
        ? React.createElement(IconLoadingOutlineRegular, {
          width: 15, height: 15, className: 'nxe-drawer-spin',
          'aria-label': copy.commitRefreshing ?? 'refreshing', role: 'status',
        })
        : null),
    description: conflicts.length === 0 ? summary : `${summary} · ${copy.factConflicted(conflicts.length)}`,
    error,
    footer: React.createElement(React.Fragment, null,
      // The close action sits at the far left of the footer so it lands under the thumb the moment
      // the reader is done, matching the spot this panel family reserves for dismissals.
      React.createElement(Button, { variant: 'outline', className: 'nano-modal-action nxe-drawer-close', onClick: onClose }, copy.cancel),
      React.createElement(Button, {
        variant: 'outline', className: 'nano-modal-action',
        disabled: busy === true,
        title: remotes.length === 0 ? copy.refreshGitTitleLocal : `${copy.refreshGitTitleLocal} + ${fetchStamp}`,
        onClick: () => { void onRefresh() },
      }, copy.refreshGit),
      React.createElement(Button, {
        variant: 'outline', className: 'nano-modal-action',
        title: copy.repoSettingsTitle,
        onClick: () => setSettingsOpen(true),
      }, copy.repoSettings),
      upstream === null
        ? null
        : React.createElement(Button, {
          variant: 'outline', className: 'nano-modal-action',
          disabled: busy === true || upstream === null || behind === 0,
          title: upstream === null ? copy.noUpstream : (behind === 0 ? copy.pullNothing : copy.pullNow),
          onClick: () => { void onPull() },
        }, behind > 0 ? `${copy.pullNow} ${behind}` : copy.pullNow),
      React.createElement(Button, {
        variant: 'primary', className: 'nano-modal-action',
        disabled: busy === true || detached || (upstream === null && remotes.length === 0),
        title: detached
          ? copy.pushDetached
          : remotes.length === 0 && upstream === null
            ? copy.pushNoRemote
            : upstream === null
              ? copy.pushFirstTitle
              : ahead === 0 ? copy.pushNothing : copy.pushNow,
        onClick: () => {
          if (upstream === null) setPendingPush(true)
          else void onPush()
        },
      }, upstream === null
        ? copy.pushFirst
        : ahead > 0 ? `${copy.pushNow} ${ahead}` : copy.pushNow)),
    onCancel: onClose,
  },
  React.createElement('div', { className: 'nxe-scm nxe-repo', 'data-nxe-scm': 'branch' },
    conflicts.length === 0 ? null : React.createElement('section', {
      className: 'nxe-repo-conflict', 'data-nxe-conflicts': String(conflicts.length),
    },
    React.createElement('p', { className: 'nxe-repo-conflict-title' },
      React.createElement('span', { className: 'nxe-chip-flag', 'data-kind': 'conflict', 'aria-hidden': 'true' }, '!'),
      ' ',
      copy.factConflicted(conflicts.length)),
    React.createElement('p', { className: 'nxe-drawer-empty' }, copy.branchConflictBlocks),
    React.createElement('ul', { className: 'nxe-drawer-list nxe-repo-conflict-list' }, conflicts.map(path => {
      const { name, dir } = splitPath(path)
      return React.createElement('li', { key: path, className: 'nxe-change', 'data-nxe-status': 'U' },
        React.createElement('span', { className: 'nxe-change-status', 'data-nxe-status': 'U' }, 'U'),
        // The .nxe-change grid is letter/icon/name; the commit drawer's conflict rows already carry
        // the glyph, and without it the button lands in the 16px icon column and reads as "d…".
        React.createElement(FileTypeIcon, { path: name, size: 16, className: 'nxe-change-icon' }),
        React.createElement('button', {
          type: 'button', className: 'nxe-drawer-link', title: path,
          onClick: () => onOpenConflict?.(path),
        },
          React.createElement('span', { className: 'nxe-change-name' },
            name,
            dir === '' ? null : React.createElement('span', { className: 'nxe-change-dir' }, dir))))
    }))),
    React.createElement(HistoryRail, { copy, history, currentBranch: current, upstream, remotes }),
    React.createElement(Input, {
      value: query,
      placeholder: copy.branchFilter,
      'aria-label': copy.branchFilter,
      'data-nxe-branch-filter': 'true',
      onChange: event => setQuery(event.currentTarget.value),
    }),
    filteredOut
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.branchFilterEmpty)
      : React.createElement(React.Fragment, null,
        remotes.length === 0 ? null : React.createElement(SegmentedControl, {
          id: 'nxe-branch-scope',
          value: tab,
          label: copy.branchTabLabel,
          options: [
            { value: 'local', label: `${copy.branchTabLocal} ${branches.length}`, title: copy.branchTabLocalTitle },
            { value: 'remote', label: `${copy.branchTabRemote} ${remoteBranches.length}`, title: fetchStamp },
          ],
          onChange: value => setBranchTab(value),
        }),
        React.createElement('section', { className: 'nxe-branch-pane' },
        tab === 'local'
          ? (branches.length === 0
            ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.branchesEmpty)
            : React.createElement(React.Fragment, null,
              checkedOut.length === 0 ? null : React.createElement(React.Fragment, null,
                React.createElement('h3', { className: 'nxe-local-head' },
                  React.createElement('span', null, copy.branchGroupCheckedOut),
                  React.createElement('span', { className: 'nxe-local-badge' }, String(checkedOut.length))),
                React.createElement('ul', { className: 'nxe-drawer-list', 'data-nxe-branches': 'true' }, checkedOut.map(row => React.createElement('li', {
                  key: row.name,
                  className: 'nxe-drawer-row',
                  'data-current': String(row.current === true),
                  'data-blocked': String(row.inOtherWorktree === true),
                },
                React.createElement('button', {
                  type: 'button', className: 'nxe-drawer-branch',
                  disabled: true,
                  title: row.inOtherWorktree === true ? copy.branchHeldElsewhere : row.name,
                }, row.name),
                row.commit === '' ? null : React.createElement('span', { className: 'nxe-graph-hash' }, row.commit),
                row.upstream === null ? null : React.createElement('span', { className: 'nxe-drawer-row-path', title: row.upstream }, row.upstream),
                conflicts.length > 0 && row.current === true
                  ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'danger' }, '!')
                  : null,
                React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'current' },
                  row.current === true ? copy.branchCurrentShort : copy.branchHeldShort))))),
              refsOnly.length === 0 ? null : React.createElement(React.Fragment, null,
                React.createElement('h3', { className: 'nxe-local-head' },
                  React.createElement('span', null, copy.branchGroupRefs),
                  React.createElement('span', { className: 'nxe-local-badge' }, String(refsOnly.length))),
                React.createElement('ul', { className: 'nxe-drawer-list', 'data-nxe-branches': 'true' }, refsOnly.map(row => React.createElement('li', {
                  key: row.name,
                  className: 'nxe-drawer-row',
                },
                React.createElement('button', {
                  type: 'button', className: 'nxe-drawer-branch',
                  disabled: busy === true || conflicts.length > 0,
                  title: conflicts.length > 0 ? copy.branchConflictBlocks : row.name,
                  onClick: () => setPendingBranch(row.name),
                  'data-nxe-checkout': row.name,
                }, row.name),
                row.commit === '' ? null : React.createElement('span', { className: 'nxe-graph-hash' }, row.commit),
                row.upstream === null ? null : React.createElement('span', { className: 'nxe-drawer-row-path', title: row.upstream }, row.upstream),
                row.upstream === null
                  ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'local' }, copy.branchLocalOnly)
                  : null))))))
          : (remoteBranches.length === 0
            ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.remoteBranchesEmpty)
            : React.createElement(React.Fragment, null,
              React.createElement('h3', { className: 'nxe-local-head' },
                React.createElement('span', null, copy.branchGroupRemote),
                React.createElement('span', { className: 'nxe-local-badge' }, String(remoteBranches.length))),
              React.createElement('ul', { className: 'nxe-drawer-list', 'data-nxe-remote-branches': 'true' }, remoteBranches.map(row => {
              const base = row.name.slice(row.name.indexOf('/') + 1)
              const tracked = localNames.has(base)
              return React.createElement('li', {
                key: row.name,
                className: 'nxe-drawer-row',
                'data-tracked': String(tracked),
              },
              React.createElement('button', {
                type: 'button', className: 'nxe-drawer-branch',
                disabled: busy === true || conflicts.length > 0,
                title: conflicts.length > 0
                  ? copy.branchConflictBlocks
                  : tracked ? row.name : copy.checkoutRemoteTitle(row.name),
                onClick: () => setPendingRemote(row.name),
                'data-nxe-remote-checkout': row.name,
              }, row.name),
              row.commit === '' ? null : React.createElement('span', { className: 'nxe-graph-hash' }, row.commit),
              row.base !== '' && row.name === row.base
                ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'current' }, copy.defaultBranch)
                : (row.ahead > 0 || row.behind > 0)
                  ? React.createElement('span', {
                    className: 'nxe-graph-stat',
                    title: copy.aheadOfBase(row.ahead, row.behind, row.base),
                  },
                  row.ahead > 0 ? React.createElement('span', { 'data-tone': 'add' }, `+${row.ahead}`) : null,
                  row.behind > 0 ? React.createElement('span', { 'data-tone': 'del' }, `−${row.behind}`) : null)
                  : null,
              tracked
                ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'current' }, copy.branchTrackedShort)
                : null)
            })))),
        React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.worktreesHeadingCount(worktrees.length)),
        worktrees.length === 0
          ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.worktreesEmpty)
          : React.createElement('ul', { className: 'nxe-drawer-list', 'data-nxe-worktrees': 'true' }, worktrees.map(row => {
            const here = row.path === git?.root
            const label = row.detached ? copy.detached : (row.branch ?? copy.detached)
            const hash = typeof row.head === 'string' ? row.head.slice(0, 7) : ''
            return React.createElement('li', {
              key: row.path,
              className: 'nxe-worktree',
              'data-current': String(here),
              title: row.path,
            },
            React.createElement('span', { className: 'nxe-worktree-mark', 'data-current': String(here), 'aria-hidden': 'true' }),
            React.createElement('span', { className: 'nxe-worktree-body' },
              React.createElement('span', { className: 'nxe-worktree-line' },
                React.createElement('span', { className: 'nxe-worktree-branch' }, label),
                hash === '' ? null : React.createElement('span', { className: 'nxe-graph-hash' }, hash),
                here ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'current' }, copy.branchCurrentShort) : null),
              React.createElement('span', { className: 'nxe-worktree-path' }, shortenPath(row.path))))
          }))))),
    pendingBranch === null ? null : React.createElement(Dialog, {
      copy,
      title: copy.checkoutTitle(pendingBranch),
      description: copy.checkoutBody(pendingBranch),
      confirmLabel: copy.checkoutConfirm,
      busy,
      onConfirm: () => {
        const name = pendingBranch
        setPendingBranch(null)
        void onCheckout(name)
      },
      onCancel: () => setPendingBranch(null),
    }, React.createElement('p', { className: 'nxe-drawer-empty' }, copy.checkoutBody(pendingBranch))),
    pendingRemote === null ? null : React.createElement(Dialog, {
      copy,
      title: copy.checkoutRemoteTitle(pendingRemote),
      description: copy.checkoutRemoteBody(pendingRemote),
      confirmLabel: copy.checkoutConfirm,
      busy,
      onConfirm: () => {
        const name = pendingRemote
        setPendingRemote(null)
        void onCheckout(name)
      },
      onCancel: () => setPendingRemote(null),
    }, React.createElement('p', { className: 'nxe-drawer-empty' }, copy.checkoutRemoteBody(pendingRemote))),
    pendingPush === false ? null : React.createElement(Dialog, {
      copy,
      title: copy.pushFirstTitle,
      description: copy.pushFirstBody(current ?? copy.detached),
      confirmLabel: copy.pushNow,
      busy,
      onConfirm: () => {
        setPendingPush(false)
        // The footer confirm publishes to the first remote; the rows below let the reader pick
        // another one when there is more than origin.
        void onPush(remotes[0]?.name)
      },
      onCancel: () => setPendingPush(false),
    }, React.createElement(PushRemotePicker, {
      copy, remotes, busy,
      onPick: remote => {
        setPendingPush(false)
        void onPush(remote)
      },
    })),
    settingsOpen ? React.createElement(RepoSettingsDialog, {
      copy, remotes, author: git?.author, sshKey: git?.sshKey, busy, error,
      onRemote, onAuthor, onSshKey,
      onCancel: () => setSettingsOpen(false),
    }) : null)
}

/**
 * The remote list the first push chooses from. Only mounts while the confirm card is open.
 * @param props - copy, the remote rows, and the pick callback.
 * @returns one button per remote.
 */
function PushRemotePicker({ copy, remotes, onPick }) {
  if (remotes.length === 0) return React.createElement('p', { className: 'nxe-drawer-empty' }, copy.pushNoRemote)
  return React.createElement('ul', { className: 'nxe-drawer-list' }, remotes.map(remote =>
    React.createElement('li', { key: remote.name, className: 'nxe-drawer-row' },
      React.createElement('button', {
        type: 'button', className: 'nxe-drawer-branch',
        title: remote.fetch === '' ? remote.name : remote.fetch,
        onClick: () => onPick(remote.name),
      }, remote.name),
      React.createElement('span', {
        className: 'nxe-drawer-row-path', title: remote.fetch === '' ? remote.push : remote.fetch,
      }, remote.fetch === '' ? remote.push : remote.fetch))))
}

/**
 * One remote: name, URL field, save and remove. The URL edits locally until Save writes it.
 * Remounts (via the parent's `key`) whenever Git reports a different fetch URL.
 * @param props - copy, the remote row, busy, and the remote callback.
 * @returns the row.
 */
function RemoteRow({ copy, remote, busy, onRemote }) {
  const [url, setUrl] = useState(remote.fetch)
  return React.createElement('li', { className: 'nxe-remote-row' },
    React.createElement('span', { className: 'nxe-remote-name', title: remote.name }, remote.name),
    React.createElement(Input, {
      value: url,
      'aria-label': copy.remoteUrlOf(remote.name),
      spellCheck: false,
      onChange: event => setUrl(event.currentTarget.value),
    }),
    React.createElement(Button, {
      variant: 'outline', className: 'nano-modal-action',
      disabled: busy === true || url.trim() === '' || url.trim() === remote.fetch,
      title: copy.remoteSaveTitle(remote.name),
      onClick: () => { void onRemote('set-url', remote.name, url.trim()) },
    }, copy.save),
    React.createElement(Button, {
      variant: 'outline', className: 'nano-modal-action',
      disabled: busy === true,
      title: copy.remoteRemoveTitle(remote.name),
      onClick: () => { void onRemote('remove', remote.name, '') },
    }, copy.remoteRemove))
}

/**
 * The repository settings card: named remotes and the commit identity.
 *
 * Remote rows edit in place — the URL field rewrites `remote.<name>.url` on save — and the
 * author block writes the local `user.name`/`user.email`, so a worktree-level identity never
 * surprises the global config.
 * @param props - copy, remotes, author, busy/error, and the save callbacks.
 * @returns the dialog, or null while closed.
 */
function RepoSettingsDialog({ copy, remotes, author, sshKey, busy, error, onRemote, onAuthor, onSshKey, onCancel }) {
  const [remoteName, setRemoteName] = useState('')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [authorName, setAuthorName] = useState(author?.name ?? '')
  const [authorEmail, setAuthorEmail] = useState(author?.email ?? '')
  const [sshPath, setSshPath] = useState(sshKey?.keyPath ?? '')
  const [remoteError, setRemoteError] = useState(undefined)
  const [authorError, setAuthorError] = useState(undefined)
  const [sshError, setSshError] = useState(undefined)
  const [settingsTab, setSettingsTab] = useState('remote')

  const submitRemote = async () => {
    const name = remoteName.trim()
    const url = remoteUrl.trim()
    setRemoteError(undefined)
    if (name === '' || name.startsWith('-')) { setRemoteError(copy.remoteNameBad); return }
    if (url === '') { setRemoteError(copy.remoteUrlBad); return }
    const exists = (remotes ?? []).some(row => row.name === name)
    await onRemote(exists ? 'set-url' : 'add', name, url)
    setRemoteName('')
    setRemoteUrl('')
  }
  const submitAuthor = async () => {
    setAuthorError(undefined)
    const name = authorName.trim()
    const email = authorEmail.trim()
    if (name === '' && email === '') { setAuthorError(copy.authorEmpty); return }
    await onAuthor(name, email)
  }
  const submitSsh = async () => {
    setSshError(undefined)
    const path = sshPath.trim()
    if (path !== '' && /[\n\r'`"\\]/u.test(path)) { setSshError(copy.sshPathBad); return }
    await onSshKey(path)
  }

  return React.createElement(Dialog, {
    copy,
    title: copy.repoSettingsTitle,
    description: copy.repoSettingsBody,
    confirmLabel: copy.dismiss,
    busy,
    error,
    onConfirm: onCancel,
    onCancel,
  },
  React.createElement('div', { className: 'nxe-repo-settings' },
    React.createElement(SegmentedControl, {
      id: 'nxe-repo-settings-scope',
      value: settingsTab,
      label: copy.repoSettingsTabs,
      options: [
        { value: 'remote', label: copy.repoTabRemote },
        { value: 'author', label: copy.repoTabAuthor },
        { value: 'ssh', label: copy.repoTabSsh },
      ],
      onChange: value => setSettingsTab(value),
    }),
    // All three panels stay mounted in one grid cell. The cell is as tall as the
    // tallest tab, so switching does not resize the card. `inert` keeps the
    // hidden tabs out of focus and out of the accessibility tree.
    React.createElement('div', { className: 'nxe-repo-stage' },
    React.createElement('div', {
      className: 'nxe-repo-panel', role: 'tabpanel', 'data-active': String(settingsTab === 'remote'),
      inert: settingsTab === 'remote' ? undefined : '',
    },
      (remotes ?? []).length === 0
        ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.remotesEmpty)
        : React.createElement('ul', { className: 'nxe-drawer-list' }, remotes.map(remote =>
          React.createElement(RemoteRow, {
            key: `${remote.name}:${remote.fetch}`, copy, remote, busy, onRemote,
          }))),
      React.createElement('div', { className: 'nxe-set-row' },
        React.createElement('span', { className: 'nxe-set-name' }, copy.remoteAdd),
        React.createElement(Input, {
          value: remoteName,
          placeholder: copy.remoteNamePh,
          'aria-label': copy.remoteNamePh,
          spellCheck: false,
          onChange: event => setRemoteName(event.currentTarget.value),
        }),
        React.createElement(Input, {
          value: remoteUrl,
          placeholder: copy.remoteUrlPh,
          'aria-label': copy.remoteUrlPh,
          spellCheck: false,
          onChange: event => setRemoteUrl(event.currentTarget.value),
        }),
        React.createElement('div', { className: 'nxe-set-actions' },
          React.createElement(Button, {
            variant: 'outline', className: 'nano-modal-action',
            disabled: busy === true,
            onClick: () => { void submitRemote() },
          }, (remotes ?? []).some(row => row.name === remoteName.trim()) ? copy.remoteSave : copy.remoteAdd))),
      remoteError === undefined ? null : React.createElement('p', { className: 'nxe-dialog-error' }, remoteError)),
    React.createElement('div', {
      className: 'nxe-repo-panel', role: 'tabpanel', 'data-active': String(settingsTab === 'author'),
      inert: settingsTab === 'author' ? undefined : '',
    },
        React.createElement('div', { className: 'nxe-set-row' },
          React.createElement('div', { className: 'nxe-set-text' },
            React.createElement('span', { className: 'nxe-set-name' }, copy.authorHeading),
            React.createElement('span', { className: 'nxe-set-desc' },
              author?.source === 'global' ? copy.authorInherited : author?.source === 'unset' ? copy.authorUnset : copy.authorLocal)),
          React.createElement('div', { className: 'nxe-set-pair' },
            React.createElement(Input, {
              value: authorName,
              placeholder: copy.authorNamePh,
              'aria-label': copy.authorNamePh,
              onChange: event => setAuthorName(event.currentTarget.value),
            }),
            React.createElement(Input, {
              value: authorEmail,
              placeholder: copy.authorEmailPh,
              'aria-label': copy.authorEmailPh,
              spellCheck: false,
              onChange: event => setAuthorEmail(event.currentTarget.value),
            })),
          React.createElement('div', { className: 'nxe-set-actions' },
            React.createElement(Button, {
              variant: 'outline', className: 'nano-modal-action',
              disabled: busy === true,
              onClick: () => { void submitAuthor() },
            }, copy.authorSave))),
        authorError === undefined ? null : React.createElement('p', { className: 'nxe-dialog-error' }, authorError)),
    React.createElement('div', {
      className: 'nxe-repo-panel', role: 'tabpanel', 'data-active': String(settingsTab === 'ssh'),
      inert: settingsTab === 'ssh' ? undefined : '',
    },
          React.createElement('div', { className: 'nxe-set-row' },
            React.createElement('div', { className: 'nxe-set-text' },
              React.createElement('span', { className: 'nxe-set-name' }, copy.sshHeading),
              React.createElement('span', { className: 'nxe-set-desc' },
                sshKey?.source === 'global' ? copy.sshInherited : sshKey?.source === 'unset' ? copy.sshUnset : copy.sshLocal)),
            sshKey?.command ? React.createElement('p', { className: 'nxe-ssh-command', title: sshKey.command }, sshKey.command) : null,
            React.createElement(Input, {
              value: sshPath,
              placeholder: copy.sshPathPh,
              'aria-label': copy.sshPathPh,
              spellCheck: false,
              onChange: event => setSshPath(event.currentTarget.value),
            }),
            React.createElement('div', { className: 'nxe-set-actions' },
              React.createElement(Button, {
                variant: 'outline', className: 'nano-modal-action',
                disabled: busy === true || (sshKey?.command ?? '') === '',
                onClick: () => { setSshPath(''); void onSshKey('') },
              }, copy.sshClear),
              React.createElement(Button, {
                variant: 'primary', className: 'nano-modal-action',
                disabled: busy === true || sshPath.trim() === '' || sshPath.trim() === (sshKey?.keyPath ?? ''),
                onClick: () => { void submitSsh() },
              }, copy.sshSave))),
          sshError === undefined ? null : React.createElement('p', { className: 'nxe-dialog-error' }, sshError)))))
}

/**
 * The commit panel: the working tree only. No history graph and no pull.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function CommitDrawer({ copy, open, git, onClose, onCommit, busy, error, refreshing, onOpenConflict, onDiff }) {
  // Same own-layer carrier as the branch card: the working tree belongs to this pane (DESIGN.md §5).
  const container = useDialogContainer()
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [diff, setDiff] = useState(null)
  const [diffError, setDiffError] = useState(undefined)
  useEffect(() => {
    if (!open) { setFilter('all'); setSelected(null); setDiff(null); setDiffError(undefined) }
  }, [open])
  useEffect(() => {
    if (!open || selected === null || typeof onDiff !== 'function') return undefined
    let cancelled = false
    setDiff(null)
    setDiffError(undefined)
    void Promise.resolve(onDiff(selected.path, selected.status === '?')).then(result => {
      if (cancelled) return
      if (result?.ok === false) setDiffError(result.message ?? copy.diffFailed)
      else setDiff(result)
    })
    return () => { cancelled = true }
  }, [open, selected, onDiff])
  if (!open || container === null) return null
  const files = git?.files ?? []
  const groups = partitionChanges(files)
  const conflicts = groups.conflicts.length > 0 ? groups.conflicts : (git?.conflicts ?? []).map(path => ({ path, status: 'U' }))
  const pending = files.length
  const current = branchName(git)
  const canCommit = pending > 0 && conflicts.length === 0 && message.trim() !== '' && busy !== true
  const submit = () => {
    if (!canCommit) return
    void Promise.resolve(onCommit(message)).then(ok => { if (ok === true) setMessage('') })
  }
  return React.createElement(NanoWindowDialog, {
    container,
    // The working-tree card fills the pane width, rises from its bottom edge, and holds one height
    // across filter switches (plugin-owned CSS on the class it hands the shared dialog).
    className: 'nxe-scm-card nxe-scm-commit',
    copy,
    // Opening the panel fires a fresh status read; the spinner sits on the title until it lands.
    title: React.createElement('span', { className: 'nxe-drawer-title' },
      copy.commitDrawerTitle,
      refreshing === true
        ? React.createElement(IconLoadingOutlineRegular, {
          width: 15, height: 15, className: 'nxe-drawer-spin',
          'aria-label': copy.commitRefreshing ?? 'refreshing', role: 'status',
        })
        : null),
    description: copy.commitDrawerBody(pending, current ?? (git?.detached ? copy.detached : null)),
    error,
    footer: React.createElement(React.Fragment, null,
      // Same dismiss spot as the branch card: left edge of the footer row.
      React.createElement(Button, { variant: 'outline', className: 'nano-modal-action nxe-drawer-close', onClick: onClose }, copy.cancel),
      React.createElement(Button, {
        variant: 'primary', className: 'nano-modal-action',
        disabled: !canCommit,
        onClick: submit,
      }, copy.commit)),
    onCancel: onClose,
  },
  React.createElement('div', { className: 'nxe-scm', 'data-nxe-scm': 'commit' },
    React.createElement(Input, {
      value: message,
      placeholder: current === null ? copy.commitPlaceholder : copy.commitPlaceholderOn(current),
      'aria-label': copy.commitMessageLabel,
      'data-modal-autofocus': true,
      'data-nxe-commit-message': 'true',
      onChange: event => setMessage(event.currentTarget.value),
      onKeyDown: event => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          submit()
        }
      },
    }),
    React.createElement('p', { className: 'nxe-commit-note' }, copy.commitAllNote),
    React.createElement(SegmentedControl, {
      id: 'nxe-commit-filter',
      value: filter,
      label: copy.filterChanges,
      options: [
        { value: 'all', label: `${copy.filterAll} ${pending}` },
        { value: 'staged', label: `${copy.localStaged} ${groups.staged.length}`, disabled: groups.staged.length === 0 },
        { value: 'unstaged', label: `${copy.localUnstaged} ${groups.unstaged.length}`, disabled: groups.unstaged.length === 0 },
        { value: 'untracked', label: `${copy.localUntracked} ${groups.untracked.length}`, disabled: groups.untracked.length === 0 },
        ...(conflicts.length === 0 ? [] : [{ value: 'conflict', label: `${copy.localConflicts} ${conflicts.length}` }]),
      ],
      onChange: value => setFilter(value),
    }),
    filter !== 'all' && filter !== 'conflict' ? null : conflicts.length === 0 ? null : React.createElement('section', { className: 'nxe-scm-group', 'data-tone': 'danger' },
      React.createElement('h3', { className: 'nxe-local-head', 'data-tone': 'danger' },
        React.createElement('span', null, copy.localConflicts),
        React.createElement('span', { className: 'nxe-local-badge' }, String(conflicts.length))),
      React.createElement('p', { className: 'nxe-drawer-empty' }, copy.conflictsBody),
      React.createElement('ul', { className: 'nxe-drawer-list' }, conflicts.map(file => React.createElement('li', {
        key: file.path, className: 'nxe-change', 'data-nxe-status': 'U',
      },
      React.createElement('span', { className: 'nxe-change-status', 'data-nxe-status': 'U' }, 'U'),
      React.createElement(FileTypeIcon, { path: file.path, size: 16, className: 'nxe-change-icon' }),
      React.createElement('button', {
        type: 'button', className: 'nxe-drawer-link', title: file.path,
        onClick: () => setSelected({ path: file.path, status: 'U' }),
      }, file.path),
      React.createElement('button', {
        type: 'button', className: 'nxe-change-open', title: copy.openFile, 'aria-label': copy.openFile,
        onClick: () => onOpenConflict(file.path),
      }, React.createElement(IconRightUpOutlineRegular, { width: 12, height: 12, 'aria-hidden': 'true' })))))),
    pending === 0
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.pendingEmpty)
      : React.createElement(React.Fragment, null,
        filter === 'all' || filter === 'staged'
          ? React.createElement(ChangeGroup, {
            label: copy.localStaged, count: groups.staged.length, files: groups.staged, tone: 'staged',
            selected: selected?.path, onSelect: file => setSelected({ path: file.path, status: file.status }),
            onOpen: onOpenConflict, openLabel: copy.openFile,
          })
          : null,
        filter === 'all' || filter === 'unstaged'
          ? React.createElement(ChangeGroup, {
            label: copy.localUnstaged, count: groups.unstaged.length, files: groups.unstaged, tone: 'unstaged',
            selected: selected?.path, onSelect: file => setSelected({ path: file.path, status: file.status }),
            onOpen: onOpenConflict, openLabel: copy.openFile,
          })
          : null,
        filter === 'all' || filter === 'untracked'
          ? React.createElement(ChangeGroup, {
            label: copy.localUntracked, count: groups.untracked.length, files: groups.untracked, tone: 'untracked',
            selected: selected?.path, onSelect: file => setSelected({ path: file.path, status: file.status }),
            onOpen: onOpenConflict, openLabel: copy.openFile,
          })
          : null,
        selected === null ? null : React.createElement('div', {
          className: 'nxe-commit-diff', 'data-nxe-commit-diff': selected.path, role: 'region', 'aria-label': selected.path,
        },
        diffError !== undefined
          ? React.createElement('p', { className: 'nxe-drawer-empty' }, diffError)
          : diff === null
            ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.diffLoading)
            : React.createElement(React.Fragment, null,
              React.createElement('p', { className: 'nxe-commit-diff-stat' },
                React.createElement('span', { 'data-tone': 'add' }, `+${diff.additions ?? 0}`),
                ' ',
                React.createElement('span', { 'data-tone': 'del' }, `−${diff.deletions ?? 0}`),
                diff.binary === true ? ` · ${copy.diffBinary}` : null,
                diff.truncated === true ? ` · ${copy.diffTruncated}` : null),
              diff.binary === true
                ? null
                : React.createElement('pre', { className: 'nxe-commit-diff-pre' }, (diff.patch ?? '').split('\n').map((line, index) =>
                  React.createElement('div', {
                    key: index,
                    className: 'nxe-commit-diff-line',
                    'data-kind': line.startsWith('+') && !line.startsWith('+++') ? 'add'
                      : line.startsWith('-') && !line.startsWith('---') ? 'del'
                        : line.startsWith('@@') ? 'hunk' : 'ctx',
                  }, line === '' ? ' ' : line))))))))
}
