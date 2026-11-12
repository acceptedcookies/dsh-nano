/** Row decorations for the shared tree: Git letter, ignored badge, link badge, and the open control. */

import React from 'react'
import { IconCloseCircleFillRegular, IconLinkOutlineRegular, IconRightUpOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * Build the accessory Component once at module scope, so the Factory never remounts it.
 * @param apiRef - a `{ current }` ref of accessors for the Git map, ignored set, preferences, and
 *   copy. The component reads `apiRef.current` at render time, which lets the Factory keep one
 *   component identity while the page swaps in fresh closures on every render.
 * @returns a Component the Factory draws beside each row.
 */
export function createAccessory(apiRef) {
  /**
   * @param props - the row's entry, supplied by the Factory.
   * @returns the row decorations.
   */
  return function Accessory({ entry }) {
    const api = apiRef.current
    const copy = api.copy()
    const status = api.statusOf(entry.path)
    const ignored = api.ignoredOf(entry.path)
    const link = api.linkOf(entry.path)
    const broken = api.linkBrokenOf(entry.path) === true
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
      // and glyph without the plugin needing to reach into the shared tree's markup. The button's
      // own data-nxe-ignored attribute (rowTriggerProps) is the primary selector; this marker stays
      // as the in-tree witness other styles still read.
      ...(ignored ? { 'data-nxe-ignored': 'true' } : {}),
    },
      // A link keeps the link glyph whatever it points at; where it leads is a tooltip detail, not a
      // warning. A link whose target is unreachable gets a struck-through variant so the row
      // explains itself instead of failing only when pressed.
      link === undefined ? null : React.createElement('span', {
        className: 'nxe-acc-link',
        title: broken ? copy.linkBroken : (link ? copy.symlinkOutsideBadge : copy.symlinkBadge),
        'aria-label': broken ? copy.linkBroken : (link ? copy.symlinkOutsideBadge : copy.symlinkBadge),
        'data-nxe-symlink': broken ? 'broken' : (link ? 'outside' : 'inside'),
      }, React.createElement(IconLinkOutlineRegular, {
        width: 14, height: 14, 'aria-hidden': 'true',
      })),
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
      // An ignored row keeps a mark of its own — only when the reader asked for it in settings.
      // The dim itself is not gated: a hidden file still reads quieter. The filled close-circle is
      // the exported variant; the Outline name does not exist in the primitive set, and the Factory's
      // error boundary once swallowed this whole accessory for it.
      ignored && api.showIgnoredBadge() ? React.createElement('span', {
        className: 'nxe-acc-ignored-letter',
        'data-status': 'ignored',
        title: copy.ignoredBadge,
        'aria-label': copy.ignoredBadge,
      }, React.createElement(IconCloseCircleFillRegular, { width: 14, height: 14, 'aria-hidden': 'true' })) : null,
      isFile && api.showOpenButton()
        ? React.createElement('button', {
          type: 'button',
          className: 'nxe-open nxe-tool',
          tabIndex: -1,
          title: copy.openFile,
          'aria-label': `${copy.openFile} ${entry.name}`,
          'data-nxe-open': entry.path,
          onClick: event => { event.stopPropagation(); api.open(entry) },
        }, React.createElement(IconRightUpOutlineRegular, { width: 12, height: 12, 'aria-hidden': 'true' }))
        : null,
    )
  }
}
