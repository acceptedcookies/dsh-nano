/** The two footer panels: branch and worktrees, and the pending work.
 *
 * Both are drawn through the shared `dsh-nano-ui` card, which is a thin forwarder over the shell's
 * Modal and Button. The shell has no separate drawer component, and a card anchored to the footer
 * edge reads the same way as an editor's panel while keeping the shipped chrome, focus handling,
 * and dismissal.
 */

import React from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { usePanelConfinedLayer } from './dialogs.js'

const { useState } = React

/**
 * One row of facts: a label and its value.
 * @param props - the two halves and an optional tone.
 * @returns the row.
 */
function Fact({ label, value, tone }) {
  return React.createElement('div', { className: 'nxe-fact', 'data-tone': tone ?? 'default' },
    React.createElement('span', { className: 'nxe-fact-label' }, label),
    React.createElement('span', { className: 'nxe-fact-value' }, value))
}

/**
 * The branch panel: current worktrees and what the remote holds.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function BranchDrawer({ copy, open, git, onClose, onPull, onRefresh, onCheckout, busy, error }) {
  usePanelConfinedLayer()
  if (!open) return null
  const worktrees = git?.worktrees ?? []
  const upstream = git?.upstream ?? null
  const behind = git?.behind ?? 0
  return React.createElement(NanoDialog, {
    copy, title: copy.branchDrawerTitle, description: copy.branchDrawerBody, error,
    maxHeight: 420,
    footer: React.createElement(React.Fragment, null,
      React.createElement(Button, { variant: 'outline', className: 'nano-modal-action', onClick: () => { void onRefresh() } }, copy.refreshGit),
      upstream === null
        ? null
        : React.createElement(Button, {
          variant: 'primary', className: 'nano-modal-action',
          disabled: busy === true || behind === 0,
          title: behind === 0 ? copy.pullNothing : copy.pullNow,
          onClick: () => { void onPull() },
        }, copy.pullNow)),
    onCancel: onClose,
  },
  React.createElement('div', { className: 'nxe-fact-group' },
    React.createElement(Fact, { label: copy.factBranch, value: git?.detached ? copy.detached : (git?.branch ?? copy.detached) }),
    React.createElement(Fact, {
      label: copy.factUpstream, value: upstream ?? copy.noUpstream,
      tone: upstream === null ? 'muted' : 'default',
    }),
    upstream === null ? null : React.createElement(Fact, {
      label: copy.factSync,
      value: copy.factSyncValue(behind, git?.ahead ?? 0),
      tone: behind > 0 ? 'emphasis' : 'default',
    }),
    React.createElement(Fact, {
      label: copy.factState,
      value: (git?.conflicts?.length ?? 0) > 0
        ? copy.factConflicted(git.conflicts.length)
        : (git?.files?.length ?? 0) > 0 ? copy.factDirty(git.files.length) : copy.factClean,
      tone: (git?.conflicts?.length ?? 0) > 0 ? 'danger' : 'default',
    })),
  React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.branchesHeading),
  (git?.branches ?? []).length === 0
    ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.branchesEmpty)
    : React.createElement('ul', { className: 'nxe-drawer-list nxe-drawer-scroll' }, (git?.branches ?? []).map(row =>
      React.createElement('li', {
        key: row.name, className: 'nxe-drawer-row',
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
      row.upstream === null ? null : React.createElement('span', { className: 'nxe-drawer-row-path' }, row.upstream),
      row.inOtherWorktree === true
        ? React.createElement('span', { className: 'nxe-drawer-row-badge' }, copy.branchHeldShort)
        : row.current === true
          ? React.createElement('span', { className: 'nxe-drawer-row-badge', 'data-tone': 'current' }, copy.branchCurrentShort)
          : null))),
  React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.worktreesHeading),
  worktrees.length === 0
    ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.worktreesEmpty)
    : React.createElement('ul', { className: 'nxe-drawer-list' }, worktrees.map(row => React.createElement('li', {
      key: row.path, className: 'nxe-drawer-row', 'data-current': String(row.path === git?.root),
    },
    React.createElement('span', { className: 'nxe-drawer-row-main' }, row.detached ? copy.detached : (row.branch ?? copy.detached)),
    React.createElement('span', { className: 'nxe-drawer-row-path', title: row.path }, row.path)))))
}

/**
 * The commit panel: the pending work, the message, the pull action, and any conflict.
 *
 * @param props - copy, Git summary, and the actions the panel can start.
 * @returns the panel, or null while closed.
 */
export function CommitDrawer({ copy, open, git, onClose, onCommit, onPull, busy, error, onOpenConflict }) {
  usePanelConfinedLayer()
  const [message, setMessage] = useState('')
  if (!open) return null
  const files = git?.files ?? []
  const conflicts = git?.conflicts ?? []
  const pending = files.length
  const upstream = git?.upstream ?? null
  const canCommit = pending > 0 && conflicts.length === 0 && message.trim() !== ''
  return React.createElement(NanoDialog, {
    copy, title: copy.commitDrawerTitle, description: copy.commitDrawerBody(pending), error,
    maxHeight: 460,
    footer: React.createElement(React.Fragment, null,
      upstream === null
        ? null
        : React.createElement(Button, {
          variant: 'outline', className: 'nano-modal-action',
          disabled: busy === true || (git?.behind ?? 0) === 0,
          title: (git?.behind ?? 0) === 0 ? copy.pullNothing : copy.pullNow,
          onClick: () => { void onPull() },
        }, copy.pullNow),
      React.createElement(Button, {
        variant: 'primary', className: 'nano-modal-action',
        disabled: !canCommit || busy === true,
        onClick: () => { void onCommit(message) },
      }, copy.commit)),
    onCancel: onClose,
  },
  React.createElement('div', { className: 'nxe-dialog-field' },
    React.createElement('p', null, copy.commitMessageLabel),
    React.createElement(Input, {
      value: message,
      placeholder: copy.commitPlaceholder,
      'data-modal-autofocus': true,
      onChange: event => setMessage(event.currentTarget.value),
    })),
  conflicts.length === 0 ? null : React.createElement('div', { className: 'nxe-conflict-block' },
    React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.conflictsHeading(conflicts.length)),
    React.createElement('p', { className: 'nxe-drawer-empty' }, copy.conflictsBody),
    React.createElement('ul', { className: 'nxe-drawer-list' }, conflicts.map(path => React.createElement('li', {
      key: path, className: 'nxe-drawer-row', 'data-tone': 'danger',
    },
    React.createElement('button', {
      type: 'button', className: 'nxe-drawer-link', title: path,
      onClick: () => onOpenConflict(path),
    }, path))))),
  React.createElement('h3', { className: 'nxe-drawer-heading' }, copy.pendingHeading(pending)),
  pending === 0
    ? React.createElement('p', { className: 'nxe-drawer-empty' }, copy.pendingEmpty)
    : React.createElement('ul', { className: 'nxe-drawer-list nxe-drawer-scroll' }, files.slice(0, 200).map(file =>
      React.createElement('li', { key: file.path, className: 'nxe-drawer-row', 'data-status': file.status },
      React.createElement('span', { className: 'nxe-drawer-row-status', 'data-status': file.status }, file.status),
      React.createElement('span', { className: 'nxe-drawer-row-main', title: file.path }, file.path)))))
}
