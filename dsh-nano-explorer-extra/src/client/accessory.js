/** Row decorations for the shared tree: Git letter, ignored badge, link badge, and the open control. */

import React from 'react'

/**
 * Build the accessory Component once at module scope, so the Factory never remounts it.
 * @param api - accessors for the Git map, ignored set, preferences, and copy.
 * @returns a Component the Factory draws beside each row.
 */
export function createAccessory(api) {
  /**
   * @param props - the row's entry, supplied by the Factory.
   * @returns the row decorations.
   */
  return function Accessory({ entry }) {
    const copy = api.copy()
    const status = api.statusOf(entry.path)
    const ignored = api.ignoredOf(entry.path)
    const link = api.linkOf(entry.path)
    const isFile = entry.meta?.kind !== 'directory'
    const folderStatus = isFile ? undefined : api.folderStatusOf(entry.path)
    const showGit = api.showGit() && !ignored
    // Both sides of the porcelain pair, so a reader can tell staged work from unstaged work.
    const staged = showGit ? api.stagedOf(entry.path) : undefined
    const unstaged = showGit ? api.unstagedOf(entry.path) : undefined
    // Divergence from the upstream, which is a different fact from a local edit.
    const remote = showGit ? api.remoteOf(entry.path) : undefined

    return React.createElement('span', {
      className: 'nxe-acc',
      // A zero-size flag the row CSS reads with :has(), so an ignored row de-emphasizes its own label
      // and glyph without the plugin needing to reach into the shared tree's markup.
      ...(ignored ? { 'data-nxe-ignored': 'true' } : {}),
    },
      link === undefined ? null : React.createElement('span', {
        className: 'nxe-acc-link',
        title: link ? copy.symlinkOutside : copy.symlinkBadge,
        'aria-label': link ? copy.symlinkOutside : copy.symlinkBadge,
        'data-nxe-symlink': link ? 'outside' : 'inside',
      }, React.createElement('svg', {
        viewBox: '0 0 24 24', width: 11, height: 11, fill: 'none', stroke: 'currentColor',
        strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': 'true',
      }, React.createElement('path', { d: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1' }),
      React.createElement('path', { d: 'M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1' }))),
      // Remote divergence sits left of the local letter: it answers "what changed on the other side".
      remote === undefined ? null : React.createElement('span', {
        className: 'nxe-acc-remote',
        'data-status': remote.status,
        'data-direction': remote.direction,
        title: remote.direction === 'pulled' ? copy.remotePulled(remote.status) : copy.remotePushed(remote.status),
        'aria-label': remote.direction === 'pulled' ? copy.remotePulled(remote.status) : copy.remotePushed(remote.status),
      }, `${remote.direction === 'pulled' ? '↓' : '↑'}${remote.status}`),
      showGit && status !== undefined
        ? React.createElement('span', {
          className: 'nxe-acc-letter',
          'data-status': status,
          // The dimmed form means "the working tree has changes the index does not", which is what
          // an unstaged edit is; a fully staged file keeps the solid letter.
          'data-staged': staged === undefined ? 'false' : 'true',
          title: api.statusLabel(status, staged, unstaged),
          'aria-label': api.statusLabel(status, staged, unstaged),
        }, status)
        : null,
      // A folder reports the strongest status anywhere below it; the dot stays visible when collapsed.
      showGit && folderStatus !== undefined
        ? React.createElement('span', {
          className: 'nxe-acc-dot',
          'data-status': folderStatus,
          title: api.statusLabel(folderStatus),
          'aria-label': api.statusLabel(folderStatus),
        })
        : null,
      // An ignored row keeps a mark of its own, so the reason it is dimmed is visible rather than implied.
      ignored ? React.createElement('span', {
        className: 'nxe-acc-ignored-letter',
        'data-status': '!',
        title: copy.ignoredBadge,
        'aria-label': copy.ignoredBadge,
      }, '!') : null,
      isFile && api.showOpenButton()
        ? React.createElement('button', {
          type: 'button',
          className: 'nxe-open nxe-tool',
          tabIndex: -1,
          title: copy.openFile,
          'aria-label': `${copy.openFile} ${entry.name}`,
          'data-nxe-open': entry.path,
          onClick: event => { event.stopPropagation(); api.open(entry) },
        }, React.createElement('svg', {
          viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor',
          strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
        }, React.createElement('path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }),
        React.createElement('path', { d: 'M15 3h6v6' }),
        React.createElement('path', { d: 'M10 14 21 3' })))
        : null,
    )
  }
}
