/**
 * The mirrored section: header styled after the workspace browser's
 * `[data-sidebar-workspace-header]` row (section label + right-aligned icon
 * buttons), then a compact body that for now reports the join state — the
 * shared-session list lands with the sync engine.
 */

import React from 'react'
import { IconGlobeOutlineRegular, IconRefreshOutlineRegular, IconSettingsOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement, useEffect, useState } = React

/** SharedWorkspace section in both sidebar widths. */
export function SharedSection({ face, wide }) {
  const copy = face.copy()
  const [settings, setSettings] = useState(face.settings.current)

  useEffect(() => face.settings.subscribe(setSettings), [])

  if (!wide) {
    // Rail mode mirrors the workspace browser's icon column: one glyph that
    // expands the sidebar on click.
    return createElement('div', { className: 'nsw-rail', role: 'complementary', 'aria-label': copy.railTitle },
      createElement('button', {
        type: 'button',
        className: 'nsw-rail-button',
        title: copy.railTitle,
        'aria-label': copy.railTitle,
        onClick: face.onToggleRail,
      }, createElement(IconGlobeOutlineRegular, { size: 16 })))
  }

  const configured = settings?.configured === true
  return createElement('div', { className: 'nsw-root', role: 'complementary', 'aria-label': copy.title },
    createElement('div', { className: 'nsw-section-header' },
      createElement('span', { className: 'nsw-section-label' },
        createElement(IconGlobeOutlineRegular, { size: 12, className: 'nsw-label-icon' }),
        copy.title),
      createElement('div', { className: 'nsw-header-actions' },
        createElement('button', {
          type: 'button',
          className: 'nsw-icon-button',
          title: copy.refresh ?? 'Refresh',
          'aria-label': copy.refresh ?? 'Refresh',
          onClick: face.onRefresh,
        }, createElement(IconRefreshOutlineRegular, { size: 13 })),
        createElement('button', {
          type: 'button',
          className: 'nsw-icon-button',
          title: copy.settings,
          'aria-label': copy.settings,
          'aria-haspopup': 'dialog',
          onClick: face.onOpenSettings,
        }, createElement(IconSettingsOutlineRegular, { size: 14 })))),
    createElement('div', { className: 'nsw-body' },
      configured === true
        ? createElement('p', { className: 'nsw-status', 'data-configured': 'true' },
            copy.configured, ' · ', settings.username ?? '—')
        : createElement('p', { className: 'nsw-status' }, copy.unconfigured),
      !configured && createElement('p', { className: 'nsw-hint' }, copy.emptyHint)))
}
