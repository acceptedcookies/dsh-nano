/** The two footer panels: branch and worktrees, and the pending work.
 *
 * Both fill the files pane. The branch panel is a worktree-first switcher: each checkout is a row
 * you can tell apart by branch, short hash, and path, which is the distinction that gets lost once
 * a repository has more than one working tree. The commit panel is a source-control preview: the
 * message, the change grouped the way an editor groups it, and the commits this change will sit on.
 */

import React from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { usePanelConfinedLayer } from './dialogs.js'
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
    React.createElement('span', { className: 'nxe-change-name' },
      name,
      dir === '' ? null : React.createElement('span', { className: 'nxe-change-dir' }, dir)))
}

/**
 * One group of changes. Absent when the group is empty, so a clean side does not leave a heading.
 * @param props - the heading and the rows.
 * @returns the section, or null.
 */
function ChangeGroup({ heading, files, tone }) {
  if (files.length === 0) return null
  return React.createElement('section', { className: 'nxe-scm-group', 'data-tone': tone ?? 'default' },
    React.createElement('h3', { className: 'nxe-drawer-heading' }, heading),
    React.createElement('ul', { className: 'nxe-drawer-list' }, files.slice(0, 400).map(file =>
      React.createElement(ChangeRow, { key: `${tone ?? ''}:${file.path}`, file }))))
}

/**
 * The commits HEAD is about to grow from. The first row is the commit a new one would sit on.
 * @param props - copy and the history payload.
 * @returns the rail.
 */
function HistoryRail({ copy, history, currentBranch }) {
  const commits = history ?? []
  return React.createElement('section', { className: 'nxe-scm-group', 'data-nxe-history': 'true' },
    React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.historyHeading),
    commits.length === 0
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.historyEmpty)
      : React.createElement('ol', { className: 'nxe-graph' }, commits.map((commit, index) =>
        React.createElement('li', {
          key: `${commit.hash}:${index}`,
          className: 'nxe-graph-row',
          'data-head': String(index === 0),
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
            'data-tone': ref === currentBranch ? 'current' : 'default',
            title: ref,
          }, ref)))))))
}

/**
 * The branch panel: switch inside this worktree, and see every other checkout.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function BranchDrawer({ copy, open, git, onClose, onPull, onRefresh, onCheckout, busy, error }) {
  usePanelConfinedLayer()
  const [query, setQuery] = useState('')
  useEffect(() => { if (!open) setQuery('') }, [open])
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
  return React.createElement(NanoDialog, {
    copy,
    title: copy.branchDrawerTitle,
    description: copy.branchDrawerSummary(
      current ?? copy.detached,
      upstream === null ? copy.noUpstream : `${upstream} · ${copy.factSyncValue(behind, ahead)}`,
      (git?.files?.length ?? 0) === 0 ? copy.factClean : copy.factDirty(git?.files?.length ?? 0),
    ),
    error,
    footer: React.createElement(React.Fragment, null,
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
  React.createElement('div', { className: 'nxe-scm', 'data-nxe-scm': 'branch' },
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
              disabled: row.current === true || row.inOtherWorktree === true || busy === true,
              title: row.inOtherWorktree === true ? copy.branchHeldElsewhere : row.name,
              onClick: () => { void onCheckout(row.name) },
              'data-nxe-checkout': row.name,
            }, row.name),
            row.commit === '' ? null : React.createElement('span', { className: 'nxe-graph-hash' }, row.commit),
            row.upstream === null ? null : React.createElement('span', { className: 'nxe-drawer-row-path', title: row.upstream }, row.upstream),
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
          })),
        React.createElement(HistoryRail, { copy, history, currentBranch: current }))))
}

/**
 * The commit panel: message, grouped changes, and the commits this one will follow.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function CommitDrawer({ copy, open, git, onClose, onCommit, onPull, busy, error, onOpenConflict }) {
  usePanelConfinedLayer()
  const [message, setMessage] = useState('')
  if (!open) return null
  const files = git?.files ?? []
  const groups = partitionChanges(files)
  const conflicts = groups.conflicts.length > 0 ? groups.conflicts : (git?.conflicts ?? []).map(path => ({ path, status: 'U' }))
  const pending = files.length
  const upstream = git?.upstream ?? null
  const behind = git?.behind ?? 0
  const current = branchName(git)
  const canCommit = pending > 0 && conflicts.length === 0 && message.trim() !== '' && busy !== true
  const submit = () => {
    if (!canCommit) return
    void Promise.resolve(onCommit(message)).then(ok => { if (ok === true) setMessage('') })
  }
  return React.createElement(NanoDialog, {
    copy,
    title: copy.commitDrawerTitle,
    description: copy.commitDrawerBody(pending, current ?? (git?.detached ? copy.detached : null)),
    error,
    footer: React.createElement(React.Fragment, null,
      upstream === null
        ? null
        : React.createElement(Button, {
          variant: 'outline', className: 'nano-modal-action',
          disabled: busy === true || behind === 0,
          title: behind === 0 ? copy.pullNothing : copy.pullNow,
          onClick: () => { void onPull() },
        }, behind > 0 ? `${copy.pullNow} ${behind}` : copy.pullNow),
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
    React.createElement('p', { className: 'nxe-scm-counts' },
      React.createElement('span', { className: 'nxe-scm-count' }, copy.countStaged(groups.staged.length)),
      React.createElement('span', { className: 'nxe-scm-count' }, copy.countUnstaged(groups.unstaged.length)),
      React.createElement('span', { className: 'nxe-scm-count' }, copy.countUntracked(groups.untracked.length)),
      conflicts.length === 0 ? null : React.createElement('span', { className: 'nxe-scm-count', 'data-tone': 'danger' }, copy.countConflict(conflicts.length))),
    React.createElement(HistoryRail, { copy, history: git?.history, currentBranch: current }),
    conflicts.length === 0 ? null : React.createElement('section', { className: 'nxe-scm-group', 'data-tone': 'danger' },
      React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.conflictsHeading(conflicts.length)),
      React.createElement('p', { className: 'nxe-drawer-empty' }, copy.conflictsBody),
      React.createElement('ul', { className: 'nxe-drawer-list' }, conflicts.map(file => React.createElement('li', {
        key: file.path, className: 'nxe-change', 'data-status': 'U',
      },
      React.createElement('span', { className: 'nxe-change-status', 'data-status': 'U' }, 'U'),
      React.createElement('button', {
        type: 'button', className: 'nxe-drawer-link', title: file.path,
        onClick: () => onOpenConflict(file.path),
      }, file.path))))),
    pending === 0
      ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.pendingEmpty)
      : React.createElement(React.Fragment, null,
        React.createElement(ChangeGroup, { heading: copy.groupStaged(groups.staged.length), files: groups.staged, tone: 'staged' }),
        React.createElement(ChangeGroup, { heading: copy.groupUnstaged(groups.unstaged.length), files: groups.unstaged, tone: 'unstaged' }),
        React.createElement(ChangeGroup, { heading: copy.groupUntracked(groups.untracked.length), files: groups.untracked, tone: 'untracked' }))))
}
