/** The footer: a branch button and a commit button on the left, workspace totals on the right. */

import React, { useEffect, useRef, useState } from 'react'
import { formatBytes, formatSync } from './format.js'
import {
  IconArchiveOutlineRegular, IconBranchOutlineRegular, IconDeliverDocRegular,
  IconFolderCloseRegular, IconGaugeOutlineRegular, IconRefreshOutlineRegular, IconSettingsOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * One labelled figure in the totals group.
 *
 * A bare number in a footer says nothing; the glyph is what makes it readable at a glance, and the
 * tooltip carries the sentence.
 *
 * @param props - icon, value, and the sentence describing it.
 * @returns the figure.
 */
function Figure({ icon, value, title, scope }) {
  return React.createElement('span', {
    className: 'nxe-figure', title, 'aria-label': title, 'data-nxe-figure': scope,
  }, icon, React.createElement('span', { className: 'nxe-figure-value' }, value))
}

/**
 * The status bar.
 *
 * Two controls on the left, mirroring a code editor's footer: the branch button opens the worktree
 * and remote panel, the commit button opens the pending-work panel. Every figure on the right carries
 * the glyph that explains it.
 *
 * @param props - copy, Git summary, statistics state, preferences, and actions.
 * @returns the footer, or null when the reader switched it off.
 */
export function StatusBar(props) {
  const { copy, git, stats, statsState, prefs, onOpenBranch, onOpenCommit } = props
  const footRef = useRef(null)
  // Overflow order is fixed: the figures dissolve first, the two left chips and the gear always
  // stay. `needRef` caches the width the full row wanted, so widening back past it restores the
  // figures — the hysteresis keeps a borderline pane from flickering between the two layouts.
  const [crowded, setCrowded] = useState(false)
  const needRef = useRef(0)
  useEffect(() => {
    const el = footRef.current
    if (!el) return undefined
    const check = () => {
      const width = el.clientWidth
      if (el.scrollWidth > width + 1) {
        needRef.current = el.scrollWidth
        setCrowded(true)
      } else if (crowded && width >= needRef.current + 32) {
        setCrowded(false)
      }
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [crowded])
  if (!prefs.showStatusBar) return null

  const left = []
  if (git === null || git === undefined) {
    left.push(React.createElement('span', {
      key: 'norepo', className: 'nxe-chip', 'data-nxe-git': 'none', title: copy.noRepo,
    },
    React.createElement(IconBranchOutlineRegular, { width: 14, height: 14, opacity: 0.5 }),
    React.createElement('span', { className: 'nxe-chip-label' }, copy.notRepo)))
  } else {
    const name = git.detached ? copy.detached : (git.branch ?? copy.detached)
    const pending = git.files?.length ?? 0
    const conflicts = git.conflicts?.length ?? 0
    const dirty = pending > 0

    // The branch button: the name plus the two facts a reader checks before switching context.
    left.push(React.createElement('button', {
      key: 'branch', type: 'button', className: 'nxe-chip nxe-chip-button',
      'data-nxe-branch-button': 'true',
      'data-dirty': String(dirty),
      'data-conflicted': String(conflicts > 0),
      'data-detached': String(git.detached === true),
      title: git.detached
        ? copy.branchTooltipDetached
        : copy.branchButtonTooltip(name, dirty, conflicts),
      'aria-label': copy.branchButtonTooltip(name, dirty, conflicts),
      onClick: onOpenBranch,
    },
    React.createElement(IconBranchOutlineRegular, { width: 14, height: 14 }),
    React.createElement('span', { className: 'nxe-chip-label', 'data-nxe-branch': git.branch ?? '' }, name),
    // A star marks uncommitted work, an exclamation marks an unresolved merge: the two reasons a
    // reader would open this panel rather than keep working.
    dirty ? React.createElement('span', { className: 'nxe-chip-flag', 'data-kind': 'dirty', 'aria-hidden': 'true' }, '*' ) : null,
    conflicts > 0 ? React.createElement('span', { className: 'nxe-chip-flag', 'data-kind': 'conflict', 'aria-hidden': 'true' }, '!' ) : null))

    if (typeof git.stashed === 'number' && git.stashed > 0) {
      left.push(React.createElement('span', {
        key: 'stash', className: 'nxe-chip nxe-chip-static', 'data-nxe-stash': String(git.stashed),
        title: copy.stashBadge(git.stashed), 'aria-label': copy.stashBadge(git.stashed),
      },
      React.createElement(IconArchiveOutlineRegular, { width: 14, height: 14 }),
      React.createElement('span', { className: 'nxe-chip-label' }, String(git.stashed))))
    }

    // The commit button mirrors the source-control segment of an editor's status bar: the sync
    // glyph, the remote pair "0↓ 53↑" when an upstream exists, then the pending-file count as a
    // filled badge — three readable parts inside one button.
    const remote = git.upstream === null || git.upstream === undefined
      ? undefined
      : formatSync(git.ahead ?? 0, git.behind ?? 0)
    left.push(React.createElement('button', {
      key: 'commit', type: 'button', className: 'nxe-chip nxe-chip-button',
      'data-nxe-commit-button': 'true',
      'data-pending': String(pending),
      title: copy.commitButtonTooltip(pending, remote === undefined ? null : remote),
      'aria-label': copy.commitButtonTooltip(pending, remote === undefined ? null : remote),
      onClick: onOpenCommit,
    },
    React.createElement(IconRefreshOutlineRegular, { width: 14, height: 14 }),
    remote === undefined ? null : React.createElement('span', { className: 'nxe-chip-sync', 'data-nxe-sync': 'true' }, remote),
    React.createElement('span', {
      className: 'nxe-chip-badge', 'data-nxe-pending': String(pending), 'data-empty': String(pending === 0),
    }, String(pending))))
  }

  const right = []
  if (crowded) {
    // A narrow pane drops the whole statistics group before anything else: it is the widest,
    // read-only segment, and the tooltip-free numbers it loses are all reachable again by
    // widening the pane. The gear stays because it is the only way back to the switches.
  } else if (statsState === 'loading') {
    right.push(React.createElement('span', { key: 'loading', className: 'nxe-figure-value' }, copy.statsLoading))
  } else if (statsState === 'failed') {
    right.push(React.createElement('button', { key: 'retry', type: 'button', className: 'nxe-retry', onClick: props.onRetryStats }, copy.statsFailed))
  } else if (stats !== undefined && stats !== null) {
    const suffix = stats.truncated ? '+' : ''
    const excluded = prefs.statsExcludeGit ? ` · ${copy.statsExcludeGit}` : ''
    right.push(React.createElement(Figure, {
      key: 'dirs', scope: 'directories',
      icon: React.createElement(IconFolderCloseRegular, { width: 14, height: 14 }),
      value: `${stats.directories}${suffix}`,
      title: copy.statsTooltip(stats.files, stats.directories, formatBytes(stats.bytes)) + excluded,
    }))
    right.push(React.createElement(Figure, {
      key: 'files', scope: 'files',
      icon: React.createElement(IconDeliverDocRegular, { width: 14, height: 14 }),
      value: `${stats.files}${suffix}`,
      title: copy.statsTooltip(stats.files, stats.directories, formatBytes(stats.bytes)) + excluded,
    }))
    right.push(React.createElement(Figure, {
      key: 'bytes', scope: 'bytes',
      icon: React.createElement(IconGaugeOutlineRegular, { width: 14, height: 14 }),
      value: formatBytes(stats.bytes),
      title: copy.statsSizeTooltip(formatBytes(stats.bytes)) + excluded,
    }))
  }

  // The gear lives at the very end of the footer: these switches change this panel only, so they sit
  // as close to it as the row allows.
  right.push(React.createElement('button', {
    key: 'settings', type: 'button', className: 'nxe-gear',
    'data-nxe-settings-button': 'true',
    title: copy.settingsTitle, 'aria-label': copy.settingsTitle,
    onClick: props.onOpenSettings,
  }, React.createElement(IconSettingsOutlineRegular, { width: 14, height: 14 })))

  return React.createElement('footer', { className: 'nxe-status', 'data-nxe-status': 'true', 'data-crowded': String(crowded), ref: footRef },
    React.createElement('div', { className: 'nxe-status-left' }, left),
    React.createElement('div', { className: 'nxe-status-right' }, right))
}
