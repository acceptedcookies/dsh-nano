/** The footer: Git branch and commit control on the left, workspace totals on the right. */

import React from 'react'
import { formatAheadBehind, formatBytes } from './format.js'
import { IconBranchOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * The status bar.
 * @param props - copy, Git summary, statistics state, preferences, and actions.
 * @returns the footer, or null when the reader switched it off.
 */
export function StatusBar(props) {
  const { copy, git, stats, statsState, prefs, onCommit, onRetryStats } = props
  if (!prefs.showStatusBar) return null

  const left = []
  if (git === null || git === undefined) {
    left.push(React.createElement('span', { key: 'norepo', className: 'nxe-branch', 'data-nxe-git': 'none' },
      React.createElement(IconBranchOutlineRegular, { width: 14, height: 14, opacity: 0.5 }),
      React.createElement('span', { className: 'nxe-branch-name' }, copy.notRepo)))
  } else {
    const name = git.detached ? copy.detached : (git.branch ?? copy.detached)
    left.push(React.createElement('span', {
      key: 'branch', className: 'nxe-branch', 'data-nxe-git': 'ready',
      'data-detached': String(git.detached === true),
      title: git.detached ? copy.branchTooltipDetached : git.upstream === null ? name : copy.branchTooltip(name, git.upstream),
    },
    React.createElement(IconBranchOutlineRegular, { width: 14, height: 14 }),
    React.createElement('span', { className: 'nxe-branch-name', 'data-nxe-branch': git.branch ?? '' }, name)))
    if (git.upstream !== null && git.upstream !== undefined) {
      const pair = formatAheadBehind(git.ahead, git.behind)
      if (pair !== '') left.push(React.createElement('span', { key: 'ab', className: 'nxe-ab', title: copy.aheadBehindTooltip(git.ahead, git.behind) }, pair))
    }
    const dirty = (git.files?.length ?? 0) > 0
    left.push(React.createElement('button', {
      key: 'commit', type: 'button', className: 'nxe-commit',
      disabled: !dirty, title: dirty ? copy.commitTooltip : copy.commitTooltipNone,
      'data-nxe-commit': 'true',
      onClick: onCommit,
    }, copy.commit))
  }

  const right = []
  if (statsState === 'loading') right.push(React.createElement('span', { key: 'loading' }, copy.statsLoading))
  else if (statsState === 'failed') right.push(React.createElement('button', { key: 'retry', type: 'button', className: 'nxe-retry', onClick: onRetryStats }, copy.statsFailed))
  else if (stats !== undefined && stats !== null) {
    const tooltip = `${copy.statsTooltip(stats.files, stats.directories, formatBytes(stats.bytes))}${stats.truncated ? ` · ${copy.truncated}` : ''}${prefs.statsExcludeGit ? ` · ${copy.statsExcludeGit}` : ''}`
    right.push(React.createElement('span', { key: 'files', title: tooltip, 'data-nxe-stats': 'true' },
      `${stats.files}${stats.truncated ? '+' : ''} · ${stats.directories} · ${formatBytes(stats.bytes)}`))
  }

  return React.createElement('footer', { className: 'nxe-status', 'data-nxe-status': 'true' },
    React.createElement('div', { className: 'nxe-status-left' }, left),
    React.createElement('div', { className: 'nxe-status-right' }, right))
}
