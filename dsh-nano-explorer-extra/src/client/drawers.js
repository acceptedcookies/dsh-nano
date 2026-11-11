/** The two footer panels. They are not two sizes of the same card.
 *
 * The commit panel is the working tree: which paths are staged, unstaged, untracked, or in conflict.
 * The branch panel is the repository: the history graph, the branch you can switch to, and every
 * worktree on this machine. Pull lives only on the second, because it is a remote action.
 */

import React from 'react'
import { Button, FileTypeIcon, IconLoadingOutlineRegular, Input, classifyFileType } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { Dialog, usePanelConfinedLayer } from './dialogs.js'
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
function ChangeRow({ file }) {
  const { name, dir } = splitPath(file.path)
  return React.createElement('li', { className: 'nxe-change', 'data-status': file.status, title: file.path },
    React.createElement('span', { className: 'nxe-change-status', 'data-status': file.status }, file.status),
    // The row reads like the source-control row it mirrors: status letter, then the type glyph the
    // platform classifier picks for this filename — language, test file, lockfile, or generic.
    React.createElement(FileTypeIcon, { kind: classifyFileType(name), size: 16, className: 'nxe-change-icon' }),
    React.createElement('span', { className: 'nxe-change-name' },
      name,
      dir === '' ? null : React.createElement('span', { className: 'nxe-change-dir' }, dir)))
}

/**
 * One group of changes. Absent when the group is empty, so a clean side does not leave a heading.
 * @param props - the heading and the rows.
 * @returns the section, or null.
 */
function ChangeGroup({ label, count, files, tone }) {
  if (files.length === 0) return null
  return React.createElement('section', { className: 'nxe-scm-group', 'data-tone': tone ?? 'default' },
    React.createElement('h3', { className: 'nxe-local-head', 'data-tone': tone ?? 'default' },
      React.createElement('span', null, label),
      React.createElement('span', { className: 'nxe-local-badge' }, String(count))),
    React.createElement('ul', { className: 'nxe-drawer-list' }, files.slice(0, 400).map(file =>
      React.createElement(ChangeRow, { key: `${tone ?? ''}:${file.path}`, file }))))
}

/**
 * The commits HEAD is about to grow from. The first row is the commit a new one would sit on.
 * @param props - copy and the history payload.
 * @returns the rail.
 */
function HistoryRail({ copy, history, currentBranch, upstream }) {
  const commits = history ?? []
  // The remote tip is the boundary the reader asked about: commits above it have never left this
  // checkout, everything at and below it is already pushed. Without an upstream there is no
  // boundary to draw, so the rail stays uniform rather than guessing from a branch-name prefix.
  const pushedFrom = upstream === null || upstream === undefined
    ? -1
    : commits.findIndex(commit => commit.refs.includes(upstream))
  return React.createElement('section', { className: 'nxe-scm-group', 'data-nxe-history': 'true' },
    React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.historyHeading),
    commits.length === 0
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.historyEmpty)
      : React.createElement('ol', { className: 'nxe-graph' }, commits.map((commit, index) =>
        React.createElement('li', {
          key: `${commit.hash}:${index}`,
          className: 'nxe-graph-row',
          'data-head': String(index === 0),
          // `ahead` marks a commit the remote does not have yet; `boundary` is the first row it
          // already has, and the stylesheet draws the divider that separates the two regions.
          'data-ahead': String(pushedFrom >= 0 && index < pushedFrom || (pushedFrom === -1 && upstream != null)),
          'data-boundary': String(pushedFrom >= 0 && index === pushedFrom),
          title: [commit.hash, ageLabel(copy, commit.time), commit.subject].filter(part => part !== '').join(' · '),
        },
        React.createElement('span', { className: 'nxe-graph-rail', 'aria-hidden': 'true' },
          React.createElement('span', { className: 'nxe-graph-dot' })),
        React.createElement('span', { className: 'nxe-graph-subject' },
          React.createElement('span', { className: 'nxe-graph-hash' }, commit.hash),
          ' ',
          commit.subject),
        React.createElement('span', { className: 'nxe-graph-pills' }, commit.refs.slice(0, 2).map(ref =>
          React.createElement('span', {
            key: ref,
            className: 'nxe-pill',
            'data-tone': ref === currentBranch ? 'current' : ref === upstream ? 'upstream' : 'default',
            title: ref,
          }, ref)))))))
}

/**
 * The branch panel: switch inside this worktree, and see every other checkout.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function BranchDrawer({ copy, open, git, onClose, onPull, onRefresh, onCheckout, onOpenConflict, busy, error }) {
  usePanelConfinedLayer(open)
  const [query, setQuery] = useState('')
  const [pendingBranch, setPendingBranch] = useState(null)
  useEffect(() => { if (!open) { setQuery(''); setPendingBranch(null) } }, [open])
  if (!open) return null
  const current = branchName(git)
  const upstream = git?.upstream ?? null
  const behind = git?.behind ?? 0
  const ahead = git?.ahead ?? 0
  const history = git?.history ?? []
  const branches = [...(git?.branches ?? [])].sort((a, b) => {
    if (a.current === true && b.current !== true) return -1
    if (b.current === true && a.current !== true) return 1
    return a.name.localeCompare(b.name)
  }).filter(row => matches(query, [row.name, row.upstream, row.commit]))
  const worktrees = (git?.worktrees ?? []).filter(row => matches(query, [
    row.branch, row.path, row.head, shortenPath(row.path),
  ]))
  const filteredOut = query.trim() !== '' && branches.length === 0 && worktrees.length === 0
  const conflicts = git?.conflicts ?? []
  const summary = copy.branchDrawerSummary(
    current ?? copy.detached,
    upstream === null ? copy.noUpstream : `${upstream} · ${copy.factSyncValue(behind, ahead)}`,
    copy.worktreesHeadingCount((git?.worktrees ?? []).length),
  )
  return React.createElement(NanoDialog, {
    copy,
    title: copy.branchDrawerTitle,
    description: conflicts.length === 0 ? summary : `${summary} · ${copy.factConflicted(conflicts.length)}`,
    error,
    footer: React.createElement(React.Fragment, null,
      // The close action sits at the far left of the footer so it lands under the thumb the moment
      // the reader is done, matching the spot this panel family reserves for dismissals.
      React.createElement(Button, { variant: 'outline', className: 'nano-modal-action nxe-drawer-close', onClick: onClose }, copy.cancel),
      React.createElement(Button, { variant: 'outline', className: 'nano-modal-action', onClick: () => { void onRefresh() } }, copy.refreshGit),
      upstream === null
        ? null
        : React.createElement(Button, {
          variant: 'primary', className: 'nano-modal-action',
          disabled: busy === true || behind === 0,
          title: behind === 0 ? copy.pullNothing : copy.pullNow,
          onClick: () => { void onPull() },
        }, behind > 0 ? `${copy.pullNow} ${behind}` : copy.pullNow)),
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
    React.createElement('ul', { className: 'nxe-drawer-list nxe-repo-conflict-list' }, conflicts.map(path =>
      React.createElement('li', { key: path, className: 'nxe-change', 'data-status': 'U' },
        React.createElement('span', { className: 'nxe-change-status', 'data-status': 'U' }, 'U'),
        React.createElement('button', {
          type: 'button', className: 'nxe-drawer-link', title: path,
          onClick: () => onOpenConflict?.(path),
        }, path))))),
    React.createElement(HistoryRail, { copy, history, currentBranch: current, upstream }),
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
        React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.branchesHeadingCount(branches.length)),
        branches.length === 0
          ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.branchesEmpty)
          : React.createElement('ul', { className: 'nxe-drawer-list', 'data-nxe-branches': 'true' }, branches.map(row =>
            React.createElement('li', {
              key: row.name,
              className: 'nxe-drawer-row',
              'data-current': String(row.current === true),
              'data-blocked': String(row.inOtherWorktree === true),
            },
            React.createElement('button', {
              type: 'button', className: 'nxe-drawer-branch',
              disabled: row.current === true || row.inOtherWorktree === true || busy === true || conflicts.length > 0,
              title: conflicts.length > 0
                ? copy.branchConflictBlocks
                : row.inOtherWorktree === true ? copy.branchHeldElsewhere : row.name,
              onClick: () => setPendingBranch(row.name),
              'data-nxe-checkout': row.name,
            }, row.name),
            row.commit === '' ? null : React.createElement('span', { className: 'nxe-graph-hash' }, row.commit),
            row.upstream === null ? null : React.createElement('span', { className: 'nxe-drawer-row-path', title: row.upstream }, row.upstream),
            conflicts.length > 0 && row.current === true
              ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'danger' }, '!')
              : null,
            row.inOtherWorktree === true
              ? React.createElement('span', { className: 'nxe-drawer-row-badge' }, copy.branchHeldShort)
              : row.current === true
                ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'current' }, copy.branchCurrentShort)
                : null))),
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
          })))),
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
    }, React.createElement('p', { className: 'nxe-drawer-empty' }, copy.checkoutBody(pendingBranch))))
}

/**
 * The commit panel: the working tree only. No history graph and no pull.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function CommitDrawer({ copy, open, git, onClose, onCommit, busy, error, refreshing, onOpenConflict }) {
  usePanelConfinedLayer(open)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')
  useEffect(() => { if (!open) setFilter('all') }, [open])
  if (!open) return null
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
  return React.createElement(NanoDialog, {
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
  React.createElement('div', { className: 'nxe-scm nxe-local', 'data-nxe-scm': 'commit' },
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
    React.createElement('div', { className: 'nxe-local-filters', role: 'group', 'aria-label': copy.filterChanges },
      [
        { id: 'all', label: copy.filterAll, count: pending },
        { id: 'staged', label: copy.localStaged, count: groups.staged.length },
        { id: 'unstaged', label: copy.localUnstaged, count: groups.unstaged.length },
        { id: 'untracked', label: copy.localUntracked, count: groups.untracked.length },
        ...(conflicts.length === 0 ? [] : [{ id: 'conflict', label: copy.localConflicts, count: conflicts.length }]),
      ].map(item => React.createElement(Button, {
        key: item.id,
        variant: filter === item.id ? 'primary' : 'outline',
        className: 'nxe-local-filter',
        disabled: item.id !== 'all' && item.count === 0,
        'aria-pressed': String(filter === item.id),
        onClick: () => setFilter(item.id),
      }, `${item.label} ${item.count}`))),
    filter !== 'all' && filter !== 'conflict' ? null : conflicts.length === 0 ? null : React.createElement('section', { className: 'nxe-scm-group', 'data-tone': 'danger' },
      React.createElement('h3', { className: 'nxe-local-head', 'data-tone': 'danger' },
        React.createElement('span', null, copy.localConflicts),
        React.createElement('span', { className: 'nxe-local-badge' }, String(conflicts.length))),
      React.createElement('p', { className: 'nxe-drawer-empty' }, copy.conflictsBody),
      React.createElement('ul', { className: 'nxe-drawer-list' }, conflicts.map(file => React.createElement('li', {
        key: file.path, className: 'nxe-change', 'data-status': 'U',
      },
      React.createElement('span', { className: 'nxe-change-status', 'data-status': 'U' }, 'U'),
      React.createElement(FileTypeIcon, { kind: classifyFileType(file.path), size: 16, className: 'nxe-change-icon' }),
      React.createElement('button', {
        type: 'button', className: 'nxe-drawer-link', title: file.path,
        onClick: () => onOpenConflict(file.path),
      }, file.path))))),
    pending === 0
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.pendingEmpty)
      : React.createElement(React.Fragment, null,
        filter === 'all' || filter === 'staged'
          ? React.createElement(ChangeGroup, { label: copy.localStaged, count: groups.staged.length, files: groups.staged, tone: 'staged' })
          : null,
        filter === 'all' || filter === 'unstaged'
          ? React.createElement(ChangeGroup, { label: copy.localUnstaged, count: groups.unstaged.length, files: groups.unstaged, tone: 'unstaged' })
          : null,
        filter === 'all' || filter === 'untracked'
          ? React.createElement(ChangeGroup, { label: copy.localUntracked, count: groups.untracked.length, files: groups.untracked, tone: 'untracked' })
          : null)))
}

/**
 * Split one unified diff into renderable rows so each hunk line carries its own tint.
 * @param diff - unified diff text.
 * @returns one entry per line, `null` when nothing was produced.
 */
function diffRows(diff) {
  if (diff === '') return null
  const rows = []
  for (const line of diff.split('\n')) {
    let tone
    if (line.startsWith('@@')) tone = 'hunk'
    else if (line.startsWith('+')) tone = 'added'
    else if (line.startsWith('-')) tone = 'removed'
    else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('rename ') || line.startsWith('similarity ') || line.startsWith('old mode') || line.startsWith('new mode') || line.startsWith('deleted file') || line.startsWith('new file')) tone = 'meta'
    else tone = 'context'
    rows.push({ line, tone })
  }
  return rows
}

/**
 * One file's diff against HEAD, in the same panel-confined card the footer drawers use.
 * @param props - language copy, the view state the menu opened, and a close callback.
 * @returns the card, or null while nothing is open.
 */
export function DiffDialog({ copy, view, onClose }) {
  const open = view !== null
  usePanelConfinedLayer(open)
  // NanoDialog mounts an always-open Modal — it has no open gate of its own. Returning it while
  // nothing is open left a titleless card that no dismiss path could remove; the footer's null
  // also fell through to the confirm/cancel pair the card family shows for real dialogs.
  if (!open) return null
  const rows = view.state === 'ready' ? diffRows(view.diff) : null
  return React.createElement(NanoDialog, {
    copy,
    title: `${copy.viewDiffTitle} · ${view.name}`,
    description: view.path,
    error: view.state === 'error' ? (view.message ?? copy.viewDiffFailed) : undefined,
    footer: React.createElement(Button, {
      variant: 'outline', className: 'nano-modal-action nxe-drawer-close', onClick: onClose,
    }, copy.cancel),
    onCancel: onClose,
  },
  view.state === 'loading'
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.loading)
      : rows === null
        ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.viewDiffEmpty)
        : React.createElement('pre', { className: 'nxe-diff', 'data-nxe-diff': 'true' },
          rows.map((row, index) => React.createElement('span', {
            key: index, className: 'nxe-diff-line', 'data-tone': row.tone,
          }, `${row.line}\n`))))
}
